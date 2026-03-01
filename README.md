# 📥 Stream Downloader

Ứng dụng desktop download video stream HLS/DASH/MSS với giao diện đồ họa hiện đại, được xây dựng bằng Electron và React.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🌟 Tính năng chính

- ✅ **Hỗ trợ đa định dạng**: HLS (.m3u8), MPEG-DASH (.mpd), Microsoft Smooth Streaming (MSS).
- ✅ **Native YouTube Support**: Tải video YouTube trực tiếp với chất lượng cao nhất (720p kèm audio), nhận diện thông minh, vượt rào cản 403 Forbidden.
- ✅ **Giao diện hiện đại**: UI/UX thân thiện, hiệu ứng kính (glassmorphism), Dark Mode mặc định.
- ✅ **Download song song**: Hỗ trợ đa luồng (multi-threading) tối ưu tốc độ.
- ✅ **Bỏ qua chống bot**: Tự động phát hiện và trích xuất stream từ trang HTML (AnimeVSub, v.v.).
- ✅ **Browser Extension (SPA Ready)**: Tích hợp extension (Chrome/Firefox) bắt link tự động, hỗ trợ các trang SPA như YouTube không cần load lại trang.
- ✅ **Quick Actions**: Nút "Mở" trực tiếp trong Sidebar và App để xem link stream ngay lập tức.
- ✅ **Giải mã mạnh mẽ**: Hỗ trợ AES-128, CENC (Widevine/PlayReady - yêu cầu key), ChaCha20.
- ✅ **Đa ngôn ngữ**: Hỗ trợ Tiếng Anh, Tiếng Việt, Trung Quốc.

---

## 📦 Hướng dẫn cài đặt

### Yêu cầu hệ thống

- **Node.js**: 18+
- **FFmpeg**: Yêu cầu để gộp (mux) video và audio.
- **OS**: Windows 10/11 (Đã tối ưu), macOS, Linux.

### Cài đặt nhanh (Development)

```bash
# 1. Clone repository
git clone <url-repo>
cd N_m3u8DL-RE/src/APP
```

Mã nguồn gốc lõi của ứng dụng dựa trên dự án open-source `N_m3u8DL-RE`. Nhánh ứng dụng mở rộng phần tuỳ biến GUI Desktop này được xây dựng bởi **Black Candy**.

## 🛠 Hướng dẫn Cài đặt & Sử dụng (Tiện ích mở rộng tự bắt m3u8)

Để tiện lợi nhất trong việc sử dụng app tải video, bạn cần cài đặt **Tiện ích mở rộng Stream Downloader** trên trình duyệt Chrome/Edge của mình để tự động bắt link video m3u8 và đẩy thẳng qua app.

1. Tải về hoặc clone project này.
2. Mở trình duyệt Chrome/Edge, truy cập vào trang Tiện ích mở rộng.
3. Bật **Developer mode**.
4. Chọn **Load unpacked** và trỏ đến thư mục `extension/` trong project.
5. **Firefox Sidebar**: Extension hỗ trợ Sidebar chuyên dụng cho Firefox.

### Giao tiếp (Port Configuration)

- **Port mặc định**: `34567` (Dùng cho cả App và Extension).
- Khi App đang chạy, icon extension sẽ hiển thị chấm **Xanh** (Connected).
- Mọi stream phát hiện được sẽ tự động hiển thị trong tab **Extension** của ứng dụng.

---

## 🔐 Advanced: DRM & Backend Integration

Mặc dù ứng dụng có bộ tải (downloader) tích hợp sẵn, bạn có thể tích hợp với backend C# gốc để hỗ trợ DRM phức tạp hơn.

### Cấu trúc Folder sau khi tích hợp:

```
APP/
└── backend/
    └── bin/
        └── win-x64/
            └── N_m3u8DL-RE.exe  # Copy binary vào đây
```

### Các tùy chọn DRM hỗ trợ:

- **KID:KEY**: Nhập trực tiếp hoặc qua file text.
- **Decryption Engines**: FFmpeg, mp4decrypt, shaka-packager.

---

## 🔧 Xử lý sự cố (Troubleshooting)

### 1. Lỗi "App trắng" (Blank Screen)

Nếu app hiển thị màn hình trống khi chạy bản build, đảm bảo project đang sử dụng `HashRouter` (đã được sửa trong bản 1.0.0).

### 2. Extension không kết nối (Chấm đỏ)

- Đảm bảo app đã khởi động.
- Kiểm tra port `34567` có bị phần mềm khác chiếm dụng không.
- Thử nút **"Test Connection"** trong cài đặt extension.

### 3. Không tìm thấy FFmpeg

- Tải FFmpeg và đặt đường dẫn trong phần **Settings > Advanced** của ứng dụng.

---

## 📄 License

MIT License. Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

---

Made with ❤️ by Stream Downloader Team
