import { createDataSource } from "@grailscope/core";

/**
 * Single app-wide data source, configured from Vite env.
 *   VITE_DATA_SOURCE=mock  → bundled demo catalogue
 *   VITE_DATA_SOURCE=http  → GrailScope API at VITE_API_URL
 */
export const dataSource = createDataSource({
  mode: import.meta.env.VITE_DATA_SOURCE as string | undefined,
  apiUrl: import.meta.env.VITE_API_URL as string | undefined,
});
