/**
 * Automatically imports and exports all components from a directory
 * @param {string} directory - The directory to import from
 * @param {string} [filePattern=/\.js$/] - Pattern to match files (default: .js files)
 * @returns {Object} Object containing all imported components
 */
export const AutoImport = (directory, filePattern = /\.js$/) => {
  const components = {};

  // Get all files in the directory
  const files = require.context(directory, false, filePattern);

  // Convert the files object to an array of file names
  const fileNames = files.keys();

  // Import each file and add it to the components object
  fileNames.forEach((fileName) => {
    // Skip index files
    if (fileName === "./index.js") return;

    // Get the component name from the file name
    const componentName = fileName.replace(/^\.\/(.*)\.js$/, "$1");

    // Import the component using dynamic import
    const component = files(fileName).default;

    // Add to components object
    components[componentName] = component;
  });

  return components;
};
