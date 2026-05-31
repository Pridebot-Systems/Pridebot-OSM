import type { Command } from "./types";

export const comingout: Command = {
  name: "comingout",
  description: "Provides resources and advice for coming out.",
  usage: "!comingout",
  execute(bot, message, _args) {
    bot.reply(
      message,
      [
        "🏳️‍🌈 Coming Out Resources",
        "",
        "Coming out is a unique and personal experience. Here are some resources that may help:",
        "",
        "📖 Guides & Articles",
        "• Human Rights Campaign - Guide to Coming Out: https://www.hrc.org/resources/coming-out",
        "• GLAAD - Tips for Coming Out: https://www.glaad.org/comingout",
        "• PFLAG - Support for Coming Out: https://pflag.org/needsupport",
        "",
        "🧑‍🎓 For Teens",
        "• USC LGBTQ+ Center - Coming Out Tips: https://lgbtqplus.usc.edu/resources/comingout/tips/",
        "• Planned Parenthood - Coming Out for Teens: https://www.plannedparenthood.org/learn/teens/lgbtq/coming-out",
        "• The Trevor Project - The Coming Out Handbook: https://www.thetrevorproject.org/resources/guide/the-coming-out-handbook/",
        "",
        "🌍 For Everyone",
        "• Stonewall - Coming Out as an Adult: https://www.stonewall.org.uk/help-advice/coming-out/coming-out-as-an-adult",
        "• Stony Brook Medicine - Tips for Coming Out: https://www.stonybrookmedicine.edu/LGBTQ/tips-for-coming-out",
        "",
        "Remember, your journey is yours and you are not alone. 💜",
      ].join("\n"),
    );
  },
};
