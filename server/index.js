// Nạp các biến môi trường từ file .env vào process.env.
// Giữ khóa API và cấu hình nhạy cảm ngoài source code.
require("dotenv").config();

// Server Express đơn giản dùng để minh họa upload ảnh và
// chuyển tiếp ảnh lên Cloudinary bằng helper `cloudinary`.
const express = require("express");

// Middleware Multer (xem server/middleware/multer.js):
// - Lưu file multipart lên đĩa tạm
// - Cung cấp thông tin file qua `req.file`.
const upload = require("./middleware/multer");

// Wrapper client Cloudinary (cấu hình cloud_name/api_key/api_secret
// lấy từ biến môi trường). Xem server/utils/cloudinary.js để biết chi tiết.
const cloudinary = require("./utils/cloudinary");

// Bật CORS và phân tích body JSON cho các endpoint API.
const cors = require("cors");

const app = express();
app.use(express.json()); // parse JSON bodies (for other endpoints)
app.use(cors()); // allow cross-origin requests (adjust in production)


// Route kiểm tra (health)
app.get("/", (req, res) => {
  // Thông báo đơn giản để biết server đang chạy.
  res.send("Send post request to /upload to upload image");
});


// Endpoint upload
// - Mong đợi multipart/form-data POST với một trường file tên "image".
// - `upload.single('image')` là middleware multer xử lý file và gán `req.file`.
// - Sau khi multer lưu file tạm, ta gọi Cloudinary uploader để đẩy file
//   từ đĩa lên cloud.
app.post("/upload", upload.single("image"), (req, res) => {
  // Lưu ý: ở production nên kiểm tra kỹ `req.file` và trả 400 nếu thiếu.
  cloudinary.uploader.upload(req.file.path, (err, result) => {
    if (err) {
      // Ghi log server để debug, trả lỗi chung cho client. Tránh lộ secret.
      console.log(err);
      return res.status(500).json({
        success: false,
        message: "Error",
      });
    }

    // Nếu upload thành công, Cloudinary trả về metadata (url, public_id, ...)
    // trong `result`. Trả về cho client để lưu URL ảnh.
    res.status(200).json({
      success: true,
      message: "Uploaded!",
      data: result,
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