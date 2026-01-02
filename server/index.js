// Nạp các biến môi trường từ file .env vào process.env.
// Giữ khóa API và cấu hình nhạy cảm ngoài source code.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require("express");
const cors = require("cors");

// Optional admin SDK for managing Firebase Auth users (used to create student accounts)
let admin = null;
let adminInitialized = false;
try {
  admin = require('firebase-admin');
  let serviceAccount = null;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT provided but JSON parse failed:', e.message);
    }
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    try {
      serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    } catch (e) {
      console.warn('⚠️ Could not load service account from path:', process.env.FIREBASE_SERVICE_ACCOUNT_PATH, e.message);
    }
  }

  if (serviceAccount) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    adminInitialized = true;
    console.log('✅ firebase-admin initialized');
  } else {
    console.warn('⚠️ firebase-admin not initialized: no service account configured (FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH)');
  }
} catch (err) {
  console.warn('⚠️ firebase-admin not available or failed to init:', err.message);
  admin = null;
}

// Email utility
const { generateVerificationCode, sendVerificationEmail } = require("./utils/email");

// Optional: Only load these if needed
let upload = null;
let cloudinary = null;

try {
  upload = require("./middleware/multer");
  cloudinary = require("./utils/cloudinary");
} catch (err) {
  console.warn("⚠️ Warning: Could not load upload middleware:", err.message);
}

const app = express();
app.use(express.json());
app.use(cors());


// Route kiểm tra (health)
app.get("/", (req, res) => {
  // Thông báo đơn giản để biết server đang chạy.
  res.send("✅ Server is running. Use POST request to /send-verification-code or /upload");
});

// API gửi mã xác nhận qua email
app.post("/send-verification-code", async (req, res) => {
  try {
    console.log('📨 Nhận request gửi email từ client');
    console.log('Request body:', req.body);
    
    const { studentEmail, studentName } = req.body;

    if (!studentEmail || !studentName) {
      console.error('❌ Thiếu studentEmail hoặc studentName');
      return res.status(400).json({
        success: false,
        message: "Email và tên học sinh là bắt buộc"
      });
    }

    // Tạo mã xác nhận
    const verificationCode = generateVerificationCode();
    console.log('🔐 Mã xác nhận được tạo:', verificationCode);

    // Create or update Firebase auth user if admin is available
    let firebaseUid = null;
    if (adminInitialized && admin) {
      try {
        // Try to find existing user
        try {
          const userRecord = await admin.auth().getUserByEmail(studentEmail);
          // Update password
          await admin.auth().updateUser(userRecord.uid, { password: verificationCode });
          firebaseUid = userRecord.uid;
          console.log('🔁 Updated existing Firebase user password for', studentEmail);
        } catch (err) {
          // If user not found, create
          if (err.code === 'auth/user-not-found') {
            const newUser = await admin.auth().createUser({ email: studentEmail, password: verificationCode });
            firebaseUid = newUser.uid;
            console.log('✅ Created new Firebase user for', studentEmail);
          } else {
            throw err;
          }
        }
      } catch (err) {
        console.warn('⚠️ Could not create/update Firebase user:', err.message);
        // Continue anyway; email will still be sent
      }
    } else {
      console.warn('⚠️ firebase-admin not initialized. Firebase Auth user will not be created. Set FIREBASE_SERVICE_ACCOUNT to enable.');
    }

    // Gửi email
    console.log('📧 Đang gửi email tới:', studentEmail);
    await sendVerificationEmail(studentEmail, studentName, verificationCode);

    // Trả về mã cho client (lưu trong Firestore)
    res.status(200).json({
      success: true,
      message: "Mã xác nhận đã gửi thành công!",
      verificationCode: verificationCode,
      firebaseUid: firebaseUid || null
    });

  } catch (error) {
    console.error("❌ Lỗi gửi email:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi gửi email: " + error.message
    });
  }
});

// Endpoint upload
app.post("/upload", (req, res) => {
  if (!upload || !cloudinary) {
    return res.status(503).json({
      success: false,
      message: "Upload service not available"
    });
  }
  
  upload.single("image")(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: "Upload error: " + err.message
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file provided"
      });
    }
    
    cloudinary.uploader.upload(req.file.path, (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({
          success: false,
          message: "Error",
        });
      }

      res.status(200).json({
        success: true,
        message: "Uploaded!",
        data: result,
      });
    });
  });
});

// Health check for firebase-admin and server internals
app.get('/admin-status', (req, res) => {
  try {
    const info = {
      firebaseAdminAvailable: !!admin,
      firebaseAdminInitialized: !!adminInitialized,
      nodeEnv: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    };
    return res.status(200).json({ success: true, info });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});


// Start server
// PORT can be set in environment (e.g., process.env.PORT) or defaults to 3000.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`listening at http://localhost:${PORT}`));

/*
Ghi chú / đề xuất:
- Validate input: kiểm tra req.file tồn tại và kiểm tra MIME type/size.
- Bảo mật: không để biến nhạy cảm trong mã nguồn; sử dụng secret
  management cho môi trường production.
- Dọn dẹp: multer lưu file tạm trên đĩa. Sau khi upload lên Cloudinary,
  nên unlink/xóa file tạm để tránh đầy ổ đĩa.
- Xử lý lỗi: trả mã HTTP rõ ràng cho lỗi client (400 cho thiếu file, ...)
  và 500 cho lỗi server.
*/
// F10: Chạy từng dòng code trong Source