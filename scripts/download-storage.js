/**
 * WebQ Storage Download Script
 * 
 * Este script baixa todos os arquivos do storage baseado no inventário exportado.
 * 
 * USO:
 * 1. Exporte o inventário em /admin/backup clicando em "Inventário Storage"
 * 2. O arquivo storage-inventory.js será baixado automaticamente
 * 3. Coloque na mesma pasta deste script
 * 4. Execute: node download-storage.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configurações
const OUTPUT_DIR = './storage-download';
const CONCURRENT_DOWNLOADS = 5;

// Cores para console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Função para baixar um arquivo
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const file = fs.createWriteStream(destPath);
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        downloadFile(response.headers.location, destPath)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {}); // Delete incomplete file
      reject(err);
    });
  });
}

// Processar downloads em lotes
async function downloadBatch(files, batchSize) {
  const results = { success: 0, failed: 0, errors: [] };
  
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (file) => {
      try {
        const destPath = path.join(OUTPUT_DIR, file.bucket, file.path);
        await downloadFile(file.url, destPath);
        results.success++;
        log(`  ✓ ${file.bucket}/${file.path}`, 'green');
      } catch (error) {
        results.failed++;
        results.errors.push({ file: `${file.bucket}/${file.path}`, error: error.message });
        log(`  ✗ ${file.bucket}/${file.path}: ${error.message}`, 'red');
      }
    }));
    
    // Progress
    const progress = Math.min(i + batchSize, files.length);
    log(`  Progresso: ${progress}/${files.length} arquivos`, 'dim');
  }
  
  return results;
}

async function main() {
  log('\n╔════════════════════════════════════════╗', 'cyan');
  log('║   WebQ Storage Download Script         ║', 'cyan');
  log('╚════════════════════════════════════════╝\n', 'cyan');

  // Tentar importar o inventário
  let inventory;
  try {
    inventory = require('./storage-inventory.js');
  } catch (err) {
    log('❌ Arquivo não encontrado: storage-inventory.js', 'red');
    log('\nPasso a passo:', 'yellow');
    log('1. Acesse /admin/backup no seu projeto Lovable');
    log('2. Clique em "Inventário Storage"');
    log('3. Salve o arquivo como "storage-inventory.js"');
    log('4. Coloque na mesma pasta deste script');
    log('5. Execute novamente: node download-storage.js\n');
    process.exit(1);
  }

  log('📋 Inventário carregado!', 'cyan');

  // Preparar lista de arquivos para download
  const filesToDownload = [];
  
  for (const bucket of inventory.buckets) {
    log(`\n📁 Bucket: ${bucket.id} (${bucket.totalFiles} arquivos)`, 'yellow');
    
    for (const file of bucket.files) {
      const url = file.publicUrl || file.signedUrl;
      if (url) {
        filesToDownload.push({
          bucket: bucket.id,
          path: file.path,
          url: url
        });
      }
    }
  }

  if (filesToDownload.length === 0) {
    log('\n⚠️  Nenhum arquivo para baixar.', 'yellow');
    process.exit(0);
  }

  // Criar diretório de saída
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  log(`\n📥 Iniciando download de ${filesToDownload.length} arquivos...`, 'cyan');
  log(`   Diretório de saída: ${path.resolve(OUTPUT_DIR)}\n`, 'dim');

  const startTime = Date.now();
  const results = await downloadBatch(filesToDownload, CONCURRENT_DOWNLOADS);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  // Resumo
  log('\n════════════════════════════════════════', 'cyan');
  log('📊 RESUMO', 'cyan');
  log('════════════════════════════════════════', 'cyan');
  log(`   ✓ Sucesso: ${results.success}`, 'green');
  if (results.failed > 0) {
    log(`   ✗ Falhas: ${results.failed}`, 'red');
  }
  log(`   ⏱  Tempo: ${duration}s`, 'dim');
  log(`   📂 Arquivos em: ${path.resolve(OUTPUT_DIR)}`, 'dim');

  if (results.errors.length > 0) {
    log('\n⚠️  Arquivos com erro:', 'yellow');
    results.errors.forEach(e => log(`   - ${e.file}: ${e.error}`, 'red'));
  }

  log('\n✅ Download concluído!', 'green');
  log('\nPróximos passos:', 'yellow');
  log('1. Acesse o Supabase Dashboard do projeto DESTINO');
  log('2. Vá em Storage → [bucket]');
  log('3. Faça upload dos arquivos de cada pasta\n');
}

main().catch(err => {
  log(`\n❌ Erro fatal: ${err.message}`, 'red');
  process.exit(1);
});
