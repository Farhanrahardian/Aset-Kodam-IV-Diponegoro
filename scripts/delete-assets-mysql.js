/**
 * Script untuk menghapus semua data aset dari MySQL
 * 
 * Usage: node scripts/delete-assets-mysql.js
 */

const mysql = require('mysql2/promise');

// Konfigurasi database
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',  // Ganti dengan password MySQL Anda
  database: 'kodam_assets'  // Ganti dengan nama database Anda
};

async function deleteAllAssets() {
  let connection;
  
  try {
    console.log('🔌 Menghubungkan ke database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Terhubung ke database');
    
    // Confirm deletion
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('\n⚠️  Apakah Anda yakin ingin menghapus SEMUA data aset? (yes/no): ', async (answer) => {
      readline.close();
      
      if (answer.toLowerCase() !== 'yes') {
        console.log('❌ Pembatalan penghapusan');
        await connection.end();
        return;
      }
      
      console.log('\n🗑️  Mulai menghapus data aset...\n');
      
      // Cek jumlah aset sebelum hapus
      const [countRows] = await connection.query('SELECT COUNT(*) as total FROM assets');
      console.log(`📊 Jumlah aset sebelum hapus: ${countRows[0].total}`);
      
      // TRUNCATE (lebih cepat dari DELETE)
      await connection.query('TRUNCATE TABLE assets');
      console.log('✅ TRUNCATE TABLE assets - Berhasil');
      
      // Reset auto increment
      await connection.query('ALTER TABLE assets AUTO_INCREMENT = 1');
      console.log('✅ ALTER TABLE assets AUTO_INCREMENT = 1 - Berhasil');
      
      // Verifikasi
      const [verifyRows] = await connection.query('SELECT COUNT(*) as total FROM assets');
      console.log(`\n📊 Jumlah aset setelah hapus: ${verifyRows[0].total}`);
      
      console.log('\n' + '='.repeat(50));
      console.log('✅ SELESAI! Semua data aset telah dihapus.');
      console.log('='.repeat(50));
      
      await connection.end();
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
  }
}

deleteAllAssets();
