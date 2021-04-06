import { setupAnyStakeMigration } from "../utils/migrate";

const main = async () => {
  await setupAnyStakeMigration();
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
