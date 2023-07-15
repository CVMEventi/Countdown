interface BaseMigration {
  migrate(oldConfig: {[key: string]: unknown}): {[key: string]: unknown};
}
