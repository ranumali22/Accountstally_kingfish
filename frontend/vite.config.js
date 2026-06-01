// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";
// import svgr from "vite-plugin-svgr";

// export default defineConfig({
//   plugins: [react(), svgr()],
// });


import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  plugins: [react(), svgr()],
  server: {
    proxy: {
      "/api": {
        target: "https://accountsmanage.kingfishlogistics.in", // 👈 yahan apna Node backend port
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
