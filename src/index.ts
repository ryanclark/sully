import * as ansi from 'ansi-styles';
import * as readline from 'readline';

const TAG_REGEX = /(?:<)([\/])?(\w*?)(?:>)/gi;
const ANSI_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g; // github.com/chalk/ansi-regex

const SECTION_CACHE: WeakMap<Token, SullySection> = new WeakMap<Token, SullySection>();

export class Token {
  constructor(private name: string) {}

  toString() {
    return `Token ${this.name}`;
  }
}

export enum LEVEL {
  None,
  Error,
  Warning,
  Info,
  Log,
  Success
};

export type Color = 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'gray';

export interface SectionOptions {
  color?: Color;
  textAlign?: 'left' | 'center' | 'right';
  width?: number;
}

function parseTags(text: string): string {
  return text.replace(TAG_REGEX, function (match, closed, color) {
    if (!Object.prototype.hasOwnProperty.call(ansi, color)) {
      return match;
    }
    let target = closed ? 'close' : 'open';
    return (<any> ansi)[color][target];
  });
}

function pad(length: number, character: string = ' ') {
  let str = '';
  for (let i = 0; i < length; i++) {
    str += character;
  }
  return str;
}

const leftCalcs = {
  left: (width) => 0,
  center: (width) => Math.floor(width / 2),
  right: (width) => width
};

const rightCalcs = {
  left: (width) => width,
  center: (width) => width - Math.floor(width / 2),
  right: (width) => 0
};

function createMessage(options: SectionOptions = {}, value: string) {
  value = parseTags(value);

  if (options.textAlign && options.width) {
    const whitespace = options.width - value.replace(ANSI_REGEX, '').length;

    let leftSpacing = leftCalcs[options.textAlign](whitespace);
    let rightSpacing = rightCalcs[options.textAlign](whitespace);

    value = `${pad(leftSpacing)}${value}${pad(rightSpacing)}`;
  }

  return value;
}

export type SullyOverride = [Token, SectionOptions, string] | [Token, string];

export class SullySection {
  private sectionId: number;

  constructor(public token: Token,
              private options?: SectionOptions,
              private value?: string) {
    SECTION_CACHE.set(token, this);
  }

  toString(override?: SullyOverride) {
    let { options, value } = this;

    if (override) {
      value = <string> (override[2] || override[1]);
      if (override[2]) {
        options = Object.assign({}, options, override[1]);
      }
    }
    return createMessage(options, value);
  }
}

export class SullyReporter {
  private sections: SullySection[] = [];
  private history: SullyMessage[] = [];

  constructor(...sections: SullySection[]) {
    this.sections = sections;
  }

  log(logLevel: LEVEL, ...overrides: SullyOverride[]) {
    let overrideMap: WeakMap<Token, SullyOverride> = new WeakMap<Token, SullyOverride>();
    for (let i = 0; i < overrides.length; i++) {
      overrideMap.set(overrides[i][0], overrides[i]);
    }

    function joinSections(prev: string, next: SullySection) {
      return prev + next.toString(overrideMap.get(next.token));
    }

    const message = this.sections.reduce<string>(joinSections, '');
    return this.history.unshift(new SullyMessage(message));
  }
}

export class SullyMessage {
  constructor(private message: string) {
    readline.clearLine(<NodeJS.WritableStream> process.stdout, 0);
    (<any> readline.cursorTo)(<NodeJS.WritableStream> process.stdout, 0);
    process.stdout.write(message + '\n');
  }
}
