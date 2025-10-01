import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
    root: path.resolve(__dirname, 'src'),
    build: {
        outDir: path.resolve(__dirname, 'dist'),
        emptyOutDir: true,
        lib: {
            entry: path.resolve(__dirname, 'src', 'index.js'),
            formats: ['es', 'umd'],
            name: 'Turbo',
            fileName: (format) => `turbo.es2017-${format === 'es' ? 'esm' : 'umd'}.js`
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src')
        }
    }
})
