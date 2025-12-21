// Nạp các biến môi trường từ file .env vào process.env.
// Giữ khóa API và cấu hình nhạy cảm ngoài source code.
require("dotenv").config();

const express = require("express");
const cors = require("cors");

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

    // Gửi email
    console.log('📧 Đang gửi email tới:', studentEmail);
    await sendVerificationEmail(studentEmail, studentName, verificationCode);

    // Trả về mã cho client (lưu trong Firebase)
    res.status(200).json({
      success: true,
      message: "Mã xác nhận đã gửi thành công!",
      verificationCode: verificationCode // Client sẽ lưu vào Firestore
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