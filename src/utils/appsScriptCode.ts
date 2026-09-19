/**
 * Complete Google Apps Script (Code.gs) source code for Google Drive Image Uploader,
 * Media Gallery Management & Direct URL generation.
 */

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT: SISTEM MANAJEMEN & PENGUNGGAH GAMBAR GOOGLE DRIVE
 * Aplikasi: Modul Belajar Digital & Admin Panel
 * =========================================================================
 * 
 * FITUR UTAMA:
 * 1. Unggah Gambar dari Browser langsung ke Google Drive (Base64 -> File Drive).
 * 2. Pembuatan Otomatis Folder "App_Media_Uploads" jika belum tersedia.
 * 3. Pengaturan Hak Akses Publik Otomatis (Anyone with link can view).
 * 4. Pembuatan Direct Image URL (Format lh3 / thumbnail) yang anti-blokir CORS & cepat.
 * 5. Daftar Galeri File (list_files) & Penghapusan File (delete_file).
 * 6. Penanganan CORS lengkap untuk integrasi Web App.
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'ping';
  var folderId = (e && e.parameter) ? e.parameter.folderId : '';
  var limit = (e && e.parameter) ? e.parameter.limit : 60;

  if (action === 'list_files') {
    return handleListFiles(folderId, limit);
  } else if (action === 'ping') {
    return createJsonResponse({
      success: true,
      status: 'ok',
      message: 'Google Apps Script Drive & Media API Aktif & Siap Digunakan.'
    });
  }

  return createJsonResponse({
    success: true,
    status: 'online',
    message: 'Layanan Google Apps Script Media Drive Aktif.'
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({
        success: false,
        error: 'Payload tidak ditemukan dalam permintaan POST.'
      });
    }

    var data = JSON.parse(e.postData.contents);
    var action = data.action || 'upload';

    if (action === 'upload') {
      return handleUpload(data);
    } else if (action === 'list_files') {
      return handleListFiles(data.folderId, data.limit);
    } else if (action === 'delete_file') {
      return handleDeleteFile(data.fileId);
    } else if (action === 'ping') {
      return createJsonResponse({
        success: true,
        status: 'ok',
        message: 'Google Apps Script Drive API terhubung dengan baik.'
      });
    }

    return createJsonResponse({
      success: false,
      error: 'Aksi "' + action + '" tidak dikenali.'
    });
  } catch (err) {
    return createJsonResponse({
      success: false,
      error: 'Terjadi kesalahan server: ' + err.toString()
    });
  }
}

/**
 * Mengunggah file Base64 ke folder Google Drive & Mengatur Sharing Publik
 */
function handleUpload(data) {
  if (!data.fileData) {
    return createJsonResponse({
      success: false,
      error: 'Data gambar (base64) tidak boleh kosong.'
    });
  }

  var folder = getOrCreateFolder(data.folderId);
  var base64Data = data.fileData;

  // Bersihkan format data URL header (contoh: data:image/png;base64,...)
  if (base64Data.indexOf('base64,') > -1) {
    base64Data = base64Data.split('base64,')[1];
  }

  var mimeType = data.mimeType || 'image/png';
  var fileName = data.fileName || ('media_' + new Date().getTime() + '.png');
  var decodedBytes = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);

  var file = folder.createFile(blob);

  // Set izin file agar dapat dibaca publik (diperlukan agar gambar tampil di web modul)
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var fileId = file.getId();
  var directUrl = 'https://lh3.googleusercontent.com/d/' + fileId;
  var viewUrl = 'https://drive.google.com/file/d/' + fileId + '/view';
  var downloadUrl = 'https://drive.google.com/uc?export=download&id=' + fileId;

  return createJsonResponse({
    success: true,
    fileId: fileId,
    fileName: file.getName(),
    directUrl: directUrl,
    viewUrl: viewUrl,
    downloadUrl: downloadUrl,
    mimeType: file.getMimeType(),
    size: file.getSize(),
    folderId: folder.getId(),
    folderName: folder.getName()
  });
}

/**
 * Mengambil daftar file gambar dari folder Google Drive
 */
function handleListFiles(folderId, limit) {
  var folder = getOrCreateFolder(folderId);
  var filesIterator = folder.getFiles();
  var files = [];
  var maxFiles = limit ? parseInt(limit, 10) : 60;

  while (filesIterator.hasNext() && files.length < maxFiles) {
    var file = filesIterator.next();
    var fId = file.getId();
    files.push({
      fileId: fId,
      fileName: file.getName(),
      directUrl: 'https://lh3.googleusercontent.com/d/' + fId,
      viewUrl: 'https://drive.google.com/file/d/' + fId + '/view',
      mimeType: file.getMimeType(),
      size: file.getSize(),
      createdDate: file.getDateCreated().toISOString()
    });
  }

  return createJsonResponse({
    success: true,
    files: files,
    folderId: folder.getId(),
    folderName: folder.getName(),
    count: files.length
  });
}

/**
 * Memindahkan file ke Sampah Google Drive
 */
function handleDeleteFile(fileId) {
  if (!fileId) {
    return createJsonResponse({
      success: false,
      error: 'Parameter fileId diperlukan.'
    });
  }
  
  try {
    var file = DriveApp.getFileById(fileId);
    file.setTrashed(true);
    return createJsonResponse({
      success: true,
      message: 'File berhasil dipindahkan ke sampah Google Drive.'
    });
  } catch (e) {
    return createJsonResponse({
      success: false,
      error: 'Gagal menghapus file: ' + e.toString()
    });
  }
}

/**
 * Mendapatkan folder Drive berdasarkan ID atau membuat folder default
 */
function getOrCreateFolder(folderId) {
  if (folderId && folderId.trim() !== '') {
    try {
      return DriveApp.getFolderById(folderId.trim());
    } catch (e) {
      // Jika ID tidak ditemukan, fallback ke folder default
    }
  }

  var folderName = 'App_Media_Uploads';
  var folders = DriveApp.getRootFolder().getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.getRootFolder().createFolder(folderName);
}

/**
 * Helper untuk response format JSON dengan MIME type yang tepat
 */
function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

export const APPS_SCRIPT_DEPLOY_STEPS = [
  {
    step: 1,
    title: 'Buka Google Apps Script',
    description: 'Buka browser dan akses script.google.com atau melalui Google Spreadsheet pilih menu "Ekstensi" > "Apps Script".'
  },
  {
    step: 2,
    title: 'Salin & Tempel Kode Script',
    description: 'Hapus seluruh isi default pada file Code.gs, lalu tempelkan (paste) seluruh kode Apps Script di atas ke dalamnya.'
  },
  {
    step: 3,
    title: 'Simpan Proyek',
    description: 'Klik ikon Disket (Simpan) atau tekan Ctrl+S / Cmd+S di editor Apps Script.'
  },
  {
    step: 4,
    title: 'Terapkan sebagai Web App (Deploy)',
    description: 'Klik tombol biru "Terapkan" (Deploy) di pojok kanan atas > Pilih "Deployment Baru" (New Deployment).'
  },
  {
    step: 5,
    title: 'Konfigurasi Hak Akses Web App',
    description: 'Pilih jenis: "Aplikasi Web" (Web App). Jalankan sebagai: "Saya" (Me). Siapa yang memiliki akses: "Siapa saja" (Anyone) -> Ini WAJIB agar upload dan galeri berfungsi.'
  },
  {
    step: 6,
    title: 'Beri Izin Akses Akun & Salin URL',
    description: 'Klik Terapkan > Berikan Izin Google Akun > Salin URL Aplikasi Web (berakhiran /exec) dan tempelkan ke kolom di bawah ini.'
  }
];
