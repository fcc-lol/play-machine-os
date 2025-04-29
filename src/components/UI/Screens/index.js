import { AutoImport } from "../../../functions/AutoImport";

// Automatically import and export all screen components
const screens = AutoImport(".", /\.js$/);

export default screens;
