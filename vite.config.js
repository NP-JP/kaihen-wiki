import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// API処理用のプラグイン
const wikiApiPlugin = () => ({
  name: 'wiki-api',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      // 共通のJSONレスポンスヘッダー
      const setJsonHeader = () => res.setHeader('Content-Type', 'application/json');

      if (req.url === '/api/wiki') {
        const filePath = path.resolve(__dirname, 'src/data/wiki-data.json');
        if (req.method === 'GET') {
          try {
            const data = fs.readFileSync(filePath, 'utf-8');
            setJsonHeader();
            res.end(data);
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to read data' }));
          }
          return;
        }
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              fs.writeFileSync(filePath, body, 'utf-8');
              res.end('OK');
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Failed to write data' }));
            }
          });
          return;
        }
      }

      // 画像一覧取得
      if (req.url === '/api/images' && req.method === 'GET') {
        const imagesDir = path.resolve(__dirname, 'public/images');
        try {
          if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
          }

          const getFiles = (dir) => {
            const results = [];
            const list = fs.readdirSync(dir);
            list.forEach(file => {
              const fullPath = path.resolve(dir, file);
              const stat = fs.statSync(fullPath);
              if (stat && stat.isDirectory()) {
                results.push(...getFiles(fullPath));
              } else {
                if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)) {
                  const relativePath = path.relative(path.resolve(__dirname, 'public'), fullPath);
                  results.push('/' + relativePath.replace(/\\/g, '/'));
                }
              }
            });
            return results;
          };

          const files = getFiles(imagesDir);
          setJsonHeader();
          res.end(JSON.stringify(files));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Failed to list images' }));
        }
        return;
      }

      next();
    });
  }
});

export default defineConfig({
  base: '/kaihen-wiki/',
  plugins: [react(), wikiApiPlugin()],
})
