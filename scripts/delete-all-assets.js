/**
 * Script untuk menghapus semua data aset dari database
 * 
 * Usage: node scripts/delete-all-assets.js
 */

const axios = require('axios');

const API_URL = 'http://localhost:3001';
const TOKEN = 'your-admin-token'; // Ganti dengan token admin Anda

async function deleteAllAssets() {
  try {
    console.log('🔍 Mengambil daftar aset...');
    
    // Get all assets
    const response = await axios.get(`${API_URL}/assets`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });
    
    const assets = response.data;
    console.log(`✅ Ditemukan ${assets.length} aset`);
    
    if (assets.length === 0) {
      console.log('✅ Tidak ada aset untuk dihapus');
      return;
    }
    
    // Confirm deletion
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question(`\n⚠️  Apakah Anda yakin ingin menghapus ${assets.length} aset? (yes/no): `, async (answer) => {
      readline.close();
      
      if (answer.toLowerCase() !== 'yes') {
        console.log('❌ Pembatalan penghapusan');
        return;
      }
      
      console.log('\n🗑️  Mulai menghapus aset...\n');
      
      let successCount = 0;
      let failCount = 0;
      
      for (const asset of assets) {
        try {
          await axios.delete(`${API_URL}/assets/${asset.id}`, {
            headers: {
              'Authorization': `Bearer ${TOKEN}`
            }
          });
          console.log(`✅ Deleted: ${asset.nama || asset.id}`);
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to delete ${asset.id}: ${error.message}`);
          failCount++;
        }
      }
      
      console.log('\n' + '='.repeat(50));
      console.log('✅ SELESAI!');
      console.log(`✅ Berhasil dihapus: ${successCount}`);
      console.log(`❌ Gagal dihapus: ${failCount}`);
      console.log('='.repeat(50));
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

deleteAllAssets();
