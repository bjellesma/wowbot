# Contributing

All base level commands ($MythicTrap, $encounters) are given their own classes in a new file in the `src\Commands` directory. Every class must implement `CommandClass`. This implementation ensures that your new class will use the expected methods. Make sure to export the class so that it can be accessed from `bot.ts`

```ts
import { CommandClass } from '../Models/CommandClass';

export class MyNewClass implements CommandClass {
    //info
}
```
