import path from "node:path";
import promises from "node:fs/promises";

import browserSyncLyb from "browser-sync";

import { src, dest, parallel, series, watch } from "gulp";
import gulpSass from "gulp-sass";
import * as dartSass from "sass";
import autoprefixer from "gulp-autoprefixer";
import cleanCss from "gulp-clean-css";
import htmlmin from "gulp-htmlmin";
import sourcemaps from "gulp-sourcemaps";
import changed from "gulp-changed";
import rename from "gulp-rename";
import concat from "gulp-concat";
import gulpWatch from "gulp-watch";
import gulpif from "gulp-if";
import urlAdjuster from "gulp-css-url-adjuster";
import imagemin, { mozjpeg, svgo, optipng } from "gulp-imagemin";
import imageminPngquant from "imagemin-pngquant";
import { deleteAsync, deleteSync } from "del";
import chalk from "chalk";

const browserSync = browserSyncLyb.create();
const sass = gulpSass(dartSass);

const isProd = process.env.NODE_ENV === "production";
console.log(isProd);

const paths = {
  html: {
    src: "src/*.html",
    dest: "dist/",
  },
  styles: {
    src: "src/scss/main.scss",
    dest: "dist/css/",
    watch: "src/scss/**/*.scss",
  },
  fonts: {
    src: "src/fonts/**/*",
    dest: "dist/fonts/",
  },
  images: {
    src: "src/images/**/*.{jpg,jpeg,png,svg}",
    dest: "dist/images",
  },
};

export function clean() {
  return deleteAsync(["dist/**", "!dist"]);
}

export function serve() {
  browserSync.init(
    {
      open: false,
      port: 9000,
      notify: false,
      server: {
        baseDir: "dist/",
      },
    },
    () => console.log(chalk.bold.blue("Сервер успешно запущен на порту 9000"))
  );
  startwatch();
}

export function html() {
  return src(paths.html.src)
    .pipe(htmlmin({ collapseWhitespace: true }))
    .pipe(dest(paths.html.dest))
    .pipe(browserSync.stream());
}

export function styles() {
  return src(paths.styles.src)
    .pipe(sourcemaps.init())
    .pipe(sass({ style: "compressed" }).on("error", sass.logError))
    .pipe(
      urlAdjuster({
        replace: ["../../fonts/", "../fonts/"],
      })
    )
    .pipe(concat("style.min.css"))
    .pipe(autoprefixer({ cascade: false }))
    .pipe(cleanCss({ level: 2 }))
    .pipe(sourcemaps.write("."))
    .pipe(dest(paths.styles.dest))
    .pipe(browserSync.stream());
}

export function images() {
  return src(paths.images.src, { encoding: false })
  .pipe(changed(paths.images.dest)) 
    .pipe(
      gulpif(
        isProd, 
        imagemin([
          mozjpeg({ quality: 60, progressive: true }),
          imageminPngquant({
            speed: 2,
            quality: [0.6, 0.8],
            strip: true,
            dithering: 0.5,
          }),
          optipng({
            optimizationLevel: 7,
            bitDepthReduction: true,
            colorTypeReduction: true,
            paletteReduction: true,
          }),
          svgo({
            plugins: [{ name: "removeViewBox", active: false }],
          }),
        ])
     ) 
    )
    .pipe(dest(paths.images.dest))
    .pipe(browserSync.stream());
}

export function copyFonts() {
  return src(paths.fonts.src, { encoding: false }).pipe(dest(paths.fonts.dest));
}

function startwatch() {
  watch(paths.html.src, html);
  watch(paths.styles.watch, styles);

  watch(paths.images.src).on("unlink", filepath => {
    deleteSync([`${filepath}`.replace(/src/, 'dist')])
  }) 

  watch(paths.images.src, images);
}

export const build = series(clean, parallel(html, copyFonts, styles, images));

export default parallel(serve);
