import type { Command } from "./types";

export const transresources: Command = {
  name: "transresources",
  description: "Provides resources and support for transgender individuals.",
  usage: "!transresources",
  execute(bot, message, _args) {
    bot.reply(
      message,
      [
        "🏳️‍⚧️ Transgender Resources",
        "",
        "📞 Trans Lifelines",
        "• US: https://translifeline.org/",
        "• UK: https://www.trans.ac.uk/ResourcesInformation/Helplines/tabid/7257/Default.aspx",
        "",
        "📖 Info on Transitioning",
        "• GLAAD Transgender Resources: https://www.glaad.org/transgender/resources",
        "• Planned Parenthood - Transgender Healthcare: https://www.plannedparenthood.org/learn/gender-identity/transgender",
        "",
        "🩹 Binder Programs",
        "• Point of Pride Free Chest Binders: https://www.pointofpride.org/free-chest-binders",
        "• ATRH Binder Program: https://www.atrh.org/binder-program",
        "",
        "💡 Understanding Dysphoria & Being Trans",
        "• Gender Dysphoria FYI: https://genderdysphoria.fyi/en/",
        "• Trevor Project - Ally Guide: https://www.thetrevorproject.org/resources/guide/a-guide-to-being-an-ally-to-transgender-and-nonbinary-youth/",
        "",
        "👕 Trans-Friendly Clothing",
        "• Point5cc: https://point5cc.com",
        "• gc2b: https://www.gc2b.co/",
        "• The Phluid Project: https://thephluidproject.com",
        "",
        "You are valid and you are loved. 💜",
      ].join("\n"),
    );
  },
};
