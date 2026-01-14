const mysql = require("mysql2/promise");
const fs = require("fs");
require("dotenv").config();

// Konfigurasi database dari .env
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "asset_management",
};

// Baca file db.json
const dbData = JSON.parse(fs.readFileSync("./db.json", "utf8"));

async function migrate() {
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Koneksi database berhasil!");

    await connection.query("SET FOREIGN_KEY_CHECKS = 0");

    // ===== MIGRASI USERS =====
    console.log("\n📊 Migrasi users...");
    for (const user of dbData.users) {
      await connection.query(
        `INSERT INTO users (id, username, password, name, role) 
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                 username = VALUES(username),
                 password = VALUES(password),
                 name = VALUES(name),
                 role = VALUES(role)`,
        [user.id, user.username, user.password, user.name, user.role]
      );
    }
    console.log(`✅ ${dbData.users.length} users berhasil dimigrasikan`);

    // ===== MIGRASI KOREM =====
    console.log("\n📊 Migrasi korem...");
    for (const korem of dbData.korem) {
      await connection.query(
        `INSERT INTO korem (id, nama, wilayah) 
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                 nama = VALUES(nama),
                 wilayah = VALUES(wilayah)`,
        [korem.id, korem.nama, korem.wilayah]
      );

      // Migrasi Kodim
      if (korem.kodim && korem.kodim.length > 0) {
        for (const kodimNama of korem.kodim) {
          await connection.query(
            `INSERT INTO kodim (korem_id, nama) 
                         VALUES (?, ?)
                         ON DUPLICATE KEY UPDATE nama = VALUES(nama)`,
            [korem.id, kodimNama]
          );
        }
      }
    }
    console.log(`✅ ${dbData.korem.length} korem berhasil dimigrasikan`);

    // ===== MIGRASI ASSETS =====
    console.log("\n📊 Migrasi assets...");
    let successCount = 0;
    let errorCount = 0;

    for (const asset of dbData.assets) {
      try {
        await connection.query(
          `INSERT INTO assets (
                        id, nama, korem_id, kodim, luas, kib_kode_barang, 
                        nomor_registrasi, alamat, peruntukan, status, 
                        asal_milik, pemilikan_sertifikat, keterangan_bukti_pemilikan,
                        sertifikat_bidang, sertifikat_luas, belum_sertifikat_bidang,
                        belum_sertifikat_luas, keterangan, atas_nama_pemilik_sertifikat,
                        lokasi, bukti_pemilikan_url, bukti_pemilikan_filename,
                        gambar_tampak_atas_url, gambar_tampak_atas_filename
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        nama = VALUES(nama),
                        luas = VALUES(luas)`,
          [
            asset.id,
            asset.nama,
            asset.korem_id,
            asset.kodim,
            asset.luas,
            asset.kib_kode_barang,
            asset.nomor_registrasi,
            asset.alamat,
            asset.peruntukan,
            asset.status,
            asset.asal_milik,
            asset.pemilikan_sertifikat,
            asset.keterangan_bukti_pemilikan,
            asset.sertifikat_bidang,
            asset.sertifikat_luas,
            asset.belum_sertifikat_bidang,
            asset.belum_sertifikat_luas,
            asset.keterangan,
            asset.atas_nama_pemilik_sertifikat,
            typeof asset.lokasi === "object"
              ? JSON.stringify(asset.lokasi)
              : asset.lokasi,
            asset.bukti_pemilikan_url || null,
            asset.bukti_pemilikan_filename || null,
            asset.gambar_tampak_atas_url || null,
            asset.gambar_tampak_atas_filename || null,
          ]
        );

        // Migrasi foto aset
        if (asset.foto_aset && asset.foto_aset.length > 0) {
          for (let i = 0; i < asset.foto_aset.length; i++) {
            await connection.query(
              `INSERT INTO foto_aset (asset_id, foto_url, urutan) 
                             VALUES (?, ?, ?)
                             ON DUPLICATE KEY UPDATE foto_url = VALUES(foto_url)`,
              [asset.id, asset.foto_aset[i], i]
            );
          }
        }

        successCount++;
      } catch (error) {
        console.error(`❌ Error migrasi asset ${asset.id}:`, error.message);
        errorCount++;
      }
    }
    console.log(`✅ Assets: ${successCount} berhasil, ${errorCount} gagal`);

    // ===== MIGRASI YARDIP ASSETS =====
    console.log("\n📊 Migrasi yardip assets...");
    let yardipSuccess = 0;
    let yardipError = 0;

    if (dbData.yardip_assets && dbData.yardip_assets.length > 0) {
      for (const yardip of dbData.yardip_assets) {
        try {
          await connection.query(
            `INSERT INTO yardip_assets (
                            id, pengelola, bidang, provinsi, kabkota, 
                            kecamatan, kelurahan, peruntukan, status, 
                            keterangan, area, lokasi, type, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                            pengelola = VALUES(pengelola),
                            bidang = VALUES(bidang),
                            area = VALUES(area),
                            updated_at = VALUES(updated_at)`,
            [
              yardip.id,
              yardip.pengelola,
              yardip.bidang,
              yardip.provinsi,
              yardip.kabkota,
              yardip.kecamatan,
              yardip.kelurahan,
              yardip.peruntukan,
              yardip.status,
              yardip.keterangan,
              yardip.area,
              yardip.lokasi,
              yardip.type || "yardip",
              yardip.created_at || new Date(),
              yardip.updated_at || new Date(),
            ]
          );
          yardipSuccess++;
        } catch (error) {
          console.error(`❌ Error migrasi yardip ${yardip.id}:`, error.message);
          yardipError++;
        }
      }
      console.log(
        `✅ Yardip Assets: ${yardipSuccess} berhasil, ${yardipError} gagal`
      );
    } else {
      console.log("ℹ️  Tidak ada data yardip untuk dimigrasikan");
    }

    await connection.query("SET FOREIGN_KEY_CHECKS = 1");

    console.log("\n" + "=".repeat(50));
    console.log("🎉 MIGRASI SELESAI");
    console.log("=".repeat(50));
    console.log(`👥 Users: ${dbData.users.length}`);
    console.log(`🏢 Korem: ${dbData.korem.length}`);
    console.log(`📦 Assets: ${successCount}/${dbData.assets.length}`);
    console.log(
      `🗺️  Yardip: ${yardipSuccess}/${dbData.yardip_assets?.length || 0}`
    );
    console.log("=".repeat(50));
  } catch (error) {
    console.error("❌ Error migrasi:", error);
  } finally {
    if (connection) {
      await connection.end();
      console.log("\n✅ Koneksi database ditutup");
    }
  }
}

migrate();
