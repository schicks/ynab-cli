{
  description = "cliynab dev environment";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };

      # Vendored node_modules as a Fixed-Output Derivation: the only part of
      # the build that needs network access, so it's isolated here and
      # pinned by content hash. Bump `outputHash` after any bun.lock change
      # (build once with `pkgs.lib.fakeHash` to get the real one from the
      # mismatch error).
      nodeModules = pkgs.stdenvNoCC.mkDerivation {
        pname = "cliynab-node-modules";
        version = "0.1.0";
        src = ./.;
        nativeBuildInputs = [ pkgs.bun pkgs.cacert ];

        buildPhase = ''
          runHook preBuild
          export HOME=$TMPDIR
          export SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt
          bun install --frozen-lockfile --no-progress --ignore-scripts
          runHook postBuild
        '';

        installPhase = ''
          mkdir -p $out
          cp -r node_modules $out/
        '';

        outputHashMode = "recursive";
        outputHashAlgo = "sha256";
        outputHash = "sha256-R18AVmjyqq/pZa0FYceDTycpATtlJk2gTQrVE+Jec4c=";
      };

      # Cross-compiling to another OS (`bun build --compile --target
      # bun-windows-x64`) makes bun download that target's runtime blob on
      # first use, caching it at $HOME/.bun/install/cache/bun-<target>-v<ver>.
      # Fetching it here, once, as its own FOD (pinned by content hash) lets
      # the real build phase pre-seed that cache and skip the network
      # entirely, same rationale as `nodeModules` above.
      windowsRuntime = pkgs.stdenvNoCC.mkDerivation {
        pname = "cliynab-bun-windows-x64-runtime";
        version = pkgs.bun.version;
        dontUnpack = true;
        nativeBuildInputs = [ pkgs.bun pkgs.cacert ];

        buildPhase = ''
          runHook preBuild
          export HOME=$TMPDIR
          export SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt
          echo 'export {}' > trivial.ts
          bun build --compile --target bun-windows-x64 trivial.ts --outfile trivial-out
          runHook postBuild
        '';

        installPhase = ''
          mkdir -p $out
          cp "$HOME/.bun/install/cache/bun-windows-x64-v${pkgs.bun.version}" $out/
        '';

        outputHashMode = "recursive";
        outputHashAlgo = "sha256";
        outputHash = "sha256-7+jLi+X0+JRseMbhTIl4eYX0RRmvHW5PIXSXZxCOj20=";
      };

      # `target` is one of scripts/build.ts's target names ("linux"/"windows");
      # `outfile` is the path it writes the compiled binary to.
      mkCliynab = { target, outfile, runtimeCache ? null }:
        pkgs.stdenvNoCC.mkDerivation {
          pname = "cliynab-${target}";
          version = "0.1.0";
          src = ./.;
          nativeBuildInputs = [ pkgs.bun ] ++ pkgs.lib.optional (target == "linux") pkgs.patchelf;

          # Bun's compiled output is a self-contained executable with a
          # bundle blob appended after the ELF/PE data, not an ordinary
          # dynamically-linked binary. Stdenv's default fixupPhase
          # (patchelf --shrink-rpath, interpreter patching, etc.) corrupts
          # that layout, so skip it entirely.
          dontFixup = true;

          # The Client ID is baked into the binary at compile time (see
          # scripts/build.ts / README) and isn't a build secret, but it does
          # have to be threaded through from the environment since flake
          # evaluation is otherwise pure. Build with `nix build --impure`
          # and YNAB_CLIENT_ID set. Also pass `--no-eval-cache`: Nix's flake
          # eval cache doesn't key on impure env vars, so a prior evaluation
          # with a different (or unset) YNAB_CLIENT_ID can otherwise be
          # served back stale.
          YNAB_CLIENT_ID = builtins.getEnv "YNAB_CLIENT_ID";

          buildPhase = ''
            runHook preBuild
            export HOME=$TMPDIR
            cp -r ${nodeModules}/node_modules .
            chmod -R u+w node_modules
          '' + pkgs.lib.optionalString (runtimeCache != null) ''
            mkdir -p "$HOME/.bun/install/cache"
            cp ${runtimeCache}/bun-windows-x64-v${pkgs.bun.version} "$HOME/.bun/install/cache/bun-windows-x64-v${pkgs.bun.version}"
          '' + ''
            bun run build -- ${target}
            runHook postBuild
          '' + pkgs.lib.optionalString (target == "linux") ''
            # nixpkgs' bun has its own ELF interpreter patched to a Nix
            # store glibc path; `bun --compile` copies that as the template
            # for the output binary, which then only runs on machines with
            # that exact store path (see oven-sh/bun#24742). Point it back
            # at the standard system loader so it runs on any glibc-linux box.
            patchelf --set-interpreter /lib64/ld-linux-x86-64.so.2 ${outfile}
          '';

          installPhase = ''
            mkdir -p $out/bin
            cp ${outfile} $out/bin/
          '';
        };
    in {
      packages.${system} = {
        linux = mkCliynab { target = "linux"; outfile = "dist/cliynab"; };
        windows = mkCliynab { target = "windows"; outfile = "dist/cliynab.exe"; runtimeCache = windowsRuntime; };
        default = self.packages.${system}.linux;
      };

      devShells.${system}.default = pkgs.mkShell {
        packages = [ pkgs.bun ];
      };
    };
}
