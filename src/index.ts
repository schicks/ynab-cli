#!/usr/bin/env bun
import { Command } from "commander";
import { accountsCommand } from "./commands/accounts";
import { budgetsCommand } from "./commands/budgets";
import { categoriesCommand } from "./commands/categories";
import { loginCommand } from "./commands/login";
import { skillCommand } from "./commands/skill";

const program = new Command("cliynab")
  .description("A CLI for interacting with YNAB")
  .version("0.1.0");

program.addCommand(loginCommand);
program.addCommand(budgetsCommand);
program.addCommand(accountsCommand);
program.addCommand(categoriesCommand);
program.addCommand(skillCommand);

program.parseAsync(process.argv);
