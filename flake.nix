{
  description = "JavaScript/TypeScript development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        # Define Node.js version - you can change this to your preferred version
        nodejs = pkgs.nodejs_20;

        devTools = with pkgs; [
          nodejs
          yarn
          pnpm
        ];
      in
      {
        # Development shell
        devShells.default = pkgs.mkShell {
          buildInputs = devTools;

          shellHook = ''
            export NPM_CONFIG_PREFIX="$PWD/.npm-global"
            export PATH="$NPM_CONFIG_PREFIX/bin:$PATH"
            mkdir -p .npm-global
            export NPM_CONFIG_CACHE="$PWD/.npm-cache"
            mkdir -p .npm-cache
          '';

          # Environment variables
          NIX_ENFORCE_PURITY = 0;
        };
      }
    );
}
