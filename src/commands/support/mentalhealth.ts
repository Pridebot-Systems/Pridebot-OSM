import type { Command } from "../types";

export const mentalhealth: Command = {
  name: "mentalhealth",
  description: "Provides mental health and crisis resources.",
  usage: "!mentalhealth",
  execute(bot, message, _args) {
    bot.reply(
      message,
      [
        "💙 Mental Health & Crisis Resources",
        "",
        "📞 Crisis Hotlines (U.S.)",
        "• Suicide & Crisis Lifeline — Call or Text 988 | https://988lifeline.org/",
        "• Trevor Project Lifeline — +1 (866) 488-7386 | https://www.thetrevorproject.org/",
        "• Trans Lifeline — +1 (877) 565-8860 | https://translifeline.org/",
        "• SAMHSA — +1 (800) 622-4357 | https://samhsa.gov/",
        "• National Domestic Violence Hotline — +1 (800) 799-7233 | https://thehotline.org/",
        "• National Sexual Assault Hotline — +1 (800) 656-4673 | https://hotline.rainn.org/online",
        "• NEDA Helpline — +1 (800) 931-2237 | https://nationaleatingdisorders.org/",
        "",
        "💬 Crisis Text Lines (U.S.)",
        "• The Trevor Project — Text START to 678-678",
        "• Crisis Text Line — Text DISCORD to 741-741 | https://crisistextline.org/",
        "",
        "🌍 International",
        "• Switchboard LGBT+ (UK) — 0800 0119 100 | https://switchboard.lgbt/",
        "• International Crisis Lines — https://en.wikipedia.org/wiki/List_of_suicide_crisis_lines",
        "",
        "You are not alone and you are loved. ❤️",
      ].join("\n"),
    );
  },
};
