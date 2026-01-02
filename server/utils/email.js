const nodemailer = require('nodemailer');

const gmailUser = process.env.GMAIL_USER || 'noreplytenkiyohou@gmail.com';
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

if (!gmailAppPassword) {
  console.warn('⚠️ GMAIL_APP_PASSWORD is missing. Email sending will fail until it is set in server/.env and the server is restarted.');
}

// Cấu hình email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailUser,
    pass: gmailAppPassword
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Kiểm tra kết nối SMTP
transporter.verify(function(error, success) {
  if (error) {
    console.error('❌ SMTP connection error:', error);
  } else {
    console.log('✅ SMTP server is ready to take messages');
  }
});

// Hàm tạo mã xác nhận ngẫu nhiên
function generateVerificationCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Hàm gửi email xác nhận
async function sendVerificationEmail(studentEmail, studentName, verificationCode) {
  try {
    const mailOptions = {
      from: gmailUser,
      to: studentEmail,
      subject: 'Mã xác nhận đăng nhập tài khoản học sinh',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #333;">Xin chào ${studentName}!</h2>
          <p>Bạn có một tài khoản học sinh mới được tạo. Dưới đây là mã xác nhận của bạn:</p>
          <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; margin: 0; letter-spacing: 5px;">${verificationCode}</h1>
          </div>
          <p><strong>Hướng dẫn sử dụng:</strong></p>
          <ol>
            <li>Truy cập vào trang đăng nhập</li>
            <li>Nhập email của bạn: <strong>${studentEmail}</strong></li>
            <li>Nhập mã xác nhận trên làm mật khẩu: <strong>${verificationCode}</strong></li>
            <li>Đăng nhập thành công!</li>
          </ol>
          <p style="color: #666; font-size: 12px;">
            <strong>Lưu ý:</strong> Mã xác nhận này có hiệu lực 24 giờ. 
            Nếu bạn không yêu cầu, vui lòng liên hệ giáo viên của bạn.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Email gửi thành công tới:', studentEmail);
    return true;
  } catch (error) {
    console.error('❌ Lỗi gửi email:', error);
    throw error;
  }
}

module.exports = {
  generateVerificationCode,
  sendVerificationEmail
};
