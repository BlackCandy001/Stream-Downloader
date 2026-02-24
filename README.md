# 📥 Stream Downloader

Ứng dụng desktop download video stream HLS/DASH/MSS với giao diện đồ họa hiện đại, được xây dựng bằng Electron và React.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🌟 Tính năng chính

- ✅ **Hỗ trợ đa định dạng**: HLS (.m3u8), MPEG-DASH (.mpd), Microsoft Smooth Streaming (MSS).
- ✅ **Giao diện hiện đại**: UI/UX thân thiện, hiệu ứng kính (glassmorphism), Dark Mode mặc định.
- ✅ **Download song song**: Hỗ trợ đa luồng (multi-threading) tối ưu tốc độ.
- ✅ **Bỏ qua chống bot**: Tự động phát hiện và trích xuất stream từ trang HTML (AnimeVSub, v.v.).
- ✅ **Browser Extension**: Tích hợp extension (Chrome/Firefox) để bắt link tự động khi lướt web.
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

# 2. Cài đặt thư viện
npm install

# 3. Chạy ứng dụng
# Terminal 1: Chạy frontend
npm run dev
# Terminal 2: Chạy Electron app
npm run electron:dev
```

### Build bản cài đặt (.exe)

```bash
npm run electron:build
```

_Kết quả sẽ nằm trong thư mục `dist-release/`._

---

## 🧩 Browser Extension Integration

Hệ thống cho phép bạn bắt link video tự động từ trình duyệt và gửi trực tiếp về app.

### Cài đặt Extension

1. Mở trang quản lý extension của trình duyệt (`chrome://extensions` hoặc `about:debugging`).
2. Bật **Developer mode**.
3. Chọn **Load unpacked** và trỏ đến thư mục `extension/` trong project.
4. **Firefox Sidebar**: Extension hỗ trợ Sidebar chuyên dụng cho Firefox.

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
