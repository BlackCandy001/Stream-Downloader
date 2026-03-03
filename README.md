# 📥 Stream Downloader

**Stream Downloader** là ứng dụng desktop cao cấp, hiện đại được thiết kế để tải video stream hiệu suất cao (HLS/DASH/MSS). Được xây dựng với **Electron**, **React**, và **TypeScript**, ứng dụng mang đến giao diện không viền (frameless) mượt mà cùng khả năng tự động hóa mạnh mẽ thông qua tiện ích mở rộng đi kèm.

![Version](https://img.shields.io/badge/phi\u00ean_b\u1ea3n-1.0.0-blue?style=for-the-badge)
![License](https://img.shields.io/badge/gi\u1ea5y_ph\u00e9p-MIT-green?style=for-the-badge)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Electron](https://img.shields.io/badge/Electron-2B2E3A?style=for-the-badge&logo=electron&logoColor=9FEAF9)

---

## ✨ Tính năng nổi bật

### 🚀 Tải xuống nâng cao

- **Hỗ trợ đa định dạng**: Tải xuống mượt mà các luồng HLS (.m3u8), MPEG-DASH (.mpd), và Microsoft Smooth Streaming (MSS).
- **Tải đa luồng song song**: Engine tối ưu hóa để tận dụng tối đa băng thông, giúp tốc độ tải cực nhanh.
- **Hỗ trợ YouTube bản quyền**: Tự động trích xuất video 720p+ và vượt qua các lỗi `401/403 Forbidden`.
- **Gộp File mạnh mẽ**: Tự động gộp các track video và audio riêng biệt bằng FFmpeg.

### 🎨 Trải nghiệm người dùng cao cấp

- **Thiết kế Frameless hiện đại**: Thanh tiêu đề tùy chỉnh tích hợp hoàn hảo vào giao diện ứng dụng.
- **Chế độ Minimal (Tối giản)**: Thanh tiến trình nhỏ gọn, có thể kéo thả để theo dõi mà không gây phiền toái.
- **Giao diện Glassmorphism**: Bố cục bán trong suốt đẹp mắt với các hiệu ứng chuyển động mượt mà.
- **Native Dark Mode**: Thẩm mỹ tối màu được tinh chỉnh cho không gian làm việc chuyên nghiệp.
- **Đa ngôn ngữ**: Hỗ trợ đầy đủ **Tiếng Việt**, **Tiếng Anh**, và **Tiếng Trung**.

### 🔌 Tích hợp liền mạch

- **Tiện ích mở rộng đi kèm**: Tự động phát hiện luồng trên bất kỳ trang web nào (bao gồm SPA/YouTube) và gửi trực tiếp đến ứng dụng.
- **Chế độ Tải tự động**: Kích hoạt tải xuống ngay lập tức từ trình duyệt mà không cần thao tác trên app desktop.
- **Tích hợp System Tray**: Thu nhỏ xuống khay hệ thống để tiếp tục tải dưới nền với thông báo trạng thái realtime.
- **Giám sát Clipboard**: Tự động phát hiện và điền URL stream khi bạn copy liên kết.

---

## 📦 Bắt đầu nhanh

### Yêu cầu hệ thống

- [Node.js](https://nodejs.org/) (v18 trở lên)
- [FFmpeg](https://ffmpeg.org/) (Yêu cầu để gộp video/audio)

### Cài đặt môi trường phát triển

```bash
# 1. Clone repository
git clone https://github.com/BlackCandy001/Stream-Downloader-M3u8.git
cd Stream-Downloader-M3u8

# 2. Cài đặt dependencies
npm install

# 3. Chạy server phát triển (Chạy trong các terminal riêng biệt)
npm run dev           # Chạy Vite frontend
npm run electron:dev  # Khởi chạy ứng dụng Electron
```

### Đóng gói ứng dụng

```bash
npm run electron:build
```

---

## 🛠 Cài đặt Tiện ích mở rộng (Chrome/Edge/Firefox)

Tiện ích **Stream Downloader Extension** là cách tốt nhất để bắt link video.

1. Truy cập `chrome://extensions` trên trình duyệt.
2. Bật **Chế độ cho nhà phát triển (Developer Mode)**.
3. Chọn **Tải tiện ích đã giải nén (Load Unpacked)** và trỏ đến thư mục `extension/` trong dự án này.
4. **Người dùng Firefox**: Tiện ích có hỗ trợ Sidebar chuyên dụng để quản lý dễ dàng hơn.

---

## 🔧 Xử lý sự cố

- **Màn hình trắng khi build?** Ứng dụng sử dụng `HashRouter` để đảm bảo điều hướng ổn định trong môi trường Electron.
- **Tiện ích không kết nối?** Đảm bảo ứng dụng đang chạy. Port mặc định là `34567`. Kiểm tra xung đột port bằng lệnh `netstat`.
- **Không tìm thấy FFmpeg?** Thiết lập thủ công đường dẫn FFmpeg trong phần **Cài đặt > Nâng cao**.

---

## 📄 Giấy phép & Tín dụng

Phát hành dưới giấy phép **MIT License**. Xem file `LICENSE` để biết thêm chi tiết.

Logic cốt lõi dựa trên cảm hứng từ dự án mã nguồn mở `N_m3u8DL-RE`.

---

Được tạo ra với ❤️ bởi **Black Candy**
