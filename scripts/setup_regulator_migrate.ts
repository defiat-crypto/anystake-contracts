import { setupRegulatorMigration } from "../utils/migrate";

const main = async () => {
  await setupRegulatorMigration();
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
