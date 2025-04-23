// Automatically import and export all screen components
const screens = {};

// Import all .js files in this directory
const screenFiles = require.context(".", false, /\.js$/);

screenFiles.keys().forEach((fileName) => {
  // Skip this index file
  if (fileName === "./index.js") return;

  // Get the component name from the file name (remove .js extension)
  const componentName = fileName.replace(/^\.\/(.*)\.js$/, "$1");

  // Import the component
  const component = require(`./${componentName}`).default;

  // Add to screens object
  screens[componentName] = component;
});

export default screens;
