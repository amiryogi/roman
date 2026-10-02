/// <reference types="vite/client" />

// Only VITE_* variables reach the browser, so nothing here may be secret (plan §21.1).
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_CLOUDINARY_CLOUD_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
