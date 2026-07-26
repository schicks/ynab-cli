import { Command } from "commander";
import { login } from "../oauth";

export const loginCommand = new Command("login")
  .description("Authorize cliynab with your YNAB account via OAuth")
  .action(async () => {
    await login();
  });
