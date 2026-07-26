#!/usr/bin/env bun
import { Command } from "commander";
import { budgetsCommand } from "./commands/budgets";
import { loginCommand } from "./commands/login";

const program = new Command("cliynab")
  .description("A CLI for interacting with YNAB")
  .version("0.1.0");

program.addCommand(loginCommand);
program.addCommand(budgetsCommand);

program.parseAsync(process.argv);
