/// <reference types="astro/client" />

// Fontsource packages ship CSS only (no type declarations); allow side-effect imports.
declare module "@fontsource/*";

// world-atlas ships TopoJSON as .json; import it untyped at build time.
declare module "world-atlas/*.json" {
  const value: any;
  export default value;
}
