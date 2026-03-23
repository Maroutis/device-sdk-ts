import { type Apdu } from "@api/apdu/model/Apdu";
import { ApduBuilder, type ApduBuilderArgs } from "@api/apdu/utils/ApduBuilder";
import { ApduParser } from "@api/apdu/utils/ApduParser";
import { type Command } from "@api/command/Command";
import {
  type CommandResult,
  CommandResultFactory,
} from "@api/command/model/CommandResult";
import {
  type CommandErrors,
  isCommandErrorCode,
} from "@api/command/utils/CommandErrors";
import { CommandUtils } from "@api/command/utils/CommandUtils";
import { GlobalCommandErrorHandler } from "@api/command/utils/GlobalCommandError";
import { type ApduResponse } from "@api/device-session/ApduResponse";
import { type CommandErrorArgs, DeviceExchangeError } from "@api/Error";

export type CreateLanguagePackageArgs = {
  readonly languageID: number;
  readonly languagePackageSize: number;
};

export type CreateLanguagePackageErrorCodes = "6621" | "672c" | "681b";

const CREATE_LANGUAGE_PACKAGE_ERRORS: CommandErrors<CreateLanguagePackageErrorCodes> =
  {
    "6621": { message: "Internal registry error." },
    "672c": { message: "Invalid APDU data length." },
    "681b": { message: "Invalid LANG_ID value." },
  };

/** Success payload (no body). Must not be `CommandResult` — that is only the return type of `parseResponse`. */
export type CreateLanguagePackageResponse = void;

export class CreateLanguagePackageCommandError extends DeviceExchangeError<CreateLanguagePackageErrorCodes> {
  constructor({
    message,
    errorCode,
  }: CommandErrorArgs<CreateLanguagePackageErrorCodes>) {
    super({ message, errorCode, tag: "CreateLanguagePackageCommandError" });
  }
}

export type CreateLanguagePackageCommandResult = CommandResult<
  void,
  CreateLanguagePackageErrorCodes
>;

/**
 * Asks the device OS to create a language package slot for the given language package id.
 *
 * @see https://ledgerhq.atlassian.net/wiki/spaces/FW/pages/4455596105/Ledger+OS+-+APDU+commands#1.11.-Create-language-pack
 */
export class CreateLanguagePackageCommand
  implements
    Command<
      CreateLanguagePackageResponse,
      CreateLanguagePackageArgs,
      CreateLanguagePackageErrorCodes
    >
{
  readonly name = "createLanguagePackage";

  constructor(private readonly args: CreateLanguagePackageArgs) {
    this.args = args;
  }

  getApdu(): Apdu {
    const apduArgs: ApduBuilderArgs = {
      cla: 0xe0,
      ins: 0x30,
      p1: this.args.languageID,
      p2: 0x00,
    };
    return new ApduBuilder(apduArgs)
      .add8BitUIntToData(this.args.languagePackageSize)
      .build();
  }

  parseResponse(
    apduResponse: ApduResponse,
  ): CreateLanguagePackageCommandResult {
    if (CommandUtils.isSuccessResponse(apduResponse)) {
      return CommandResultFactory<void, CreateLanguagePackageErrorCodes>({
        data: undefined,
      });
    }
    const parser = new ApduParser(apduResponse);
    const errorCode = parser.encodeToHexaString(apduResponse.statusCode);
    if (isCommandErrorCode(errorCode, CREATE_LANGUAGE_PACKAGE_ERRORS)) {
      return CommandResultFactory({
        error: new CreateLanguagePackageCommandError({
          ...CREATE_LANGUAGE_PACKAGE_ERRORS[errorCode],
          errorCode,
        }),
      });
    }
    return CommandResultFactory({
      error: GlobalCommandErrorHandler.handle(apduResponse),
    });
  }
}
