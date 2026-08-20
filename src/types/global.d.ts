// Allow side-effect imports of stylesheets and static assets.
// Without these declarations, TypeScript can't resolve `import './globals.css'`
// (and similar `import './x.css'`, `import url('...')`, image, font, etc.).

declare module '*.css';
declare module '*.scss';
declare module '*.sass';
declare module '*.less';
declare module '*.styl';
declare module '*.pcss';
declare module '*.postcss';

declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.webp';
declare module '*.avif';
declare module '*.svg';
declare module '*.ico';
declare module '*.bmp';

declare module '*.mp3';
declare module '*.mp4';
declare module '*.webm';
declare module '*.ogg';
declare module '*.wav';

declare module '*.woff';
declare module '*.woff2';
declare module '*.ttf';
declare module '*.otf';
declare module '*.eot';

declare module '*.json' {
  const value: unknown;
  export default value;
}