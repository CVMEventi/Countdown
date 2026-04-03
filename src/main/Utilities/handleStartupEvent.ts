export const handleStartupEvent = function(): boolean {
  if (process.platform !== 'win32') {
    return false;
  }

  const squirrelCommand = process.argv[1];
  switch (squirrelCommand) {
    case '--squirrel-install':
    case '--squirrel-updated':
    case '--squirrel-uninstall':
    case '--squirrel-obsolete':
      return true;
  }
};
