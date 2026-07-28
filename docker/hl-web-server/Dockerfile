FROM --platform=linux/amd64 node:22-alpine AS wasm

RUN npm install -g pnpm

WORKDIR /client

COPY docker/hl-web-server/package.json docker/hl-web-server/package.json
COPY package.json package.json
COPY pnpm-lock.yaml pnpm-lock.yaml
COPY pnpm-workspace.yaml pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile

FROM yohimik/cs-web-server:latest

USER root
RUN rm -rf /xashds/cstrike
RUN rm -rf /xashds/public/cstrike
USER xashds

COPY --from=wasm /client/docker/hl-web-server/node_modules/hlsdk-portable/dist/valve/ ./public/valve
COPY --from=wasm /client/docker/hl-web-server/node_modules/xash3d-fwgs/dist/valve/ ./public/valve
COPY --from=wasm /client/docker/hl-web-server/node_modules/xash3d-fwgs/dist/libmenu.wasm ./public/valve/libmenu.wasm

# Engine configuration
ENV GAME_DIR="valve"
ENV ENGINE_ARGS="-windowed"
ENV ENGINE_CONSOLE=""

# Library paths
ENV CLIENT_WASM_PATH="valve/cl_dlls/client_emscripten_wasm32.wasm"
ENV SERVER_WASM_PATH="valve/dlls/hl_emscripten_wasm32.wasm"
ENV MENU_WASM_PATH="valve/libmenu.wasm"
ENV EXTRAS_PATH="valve/extras.pk3"
ENV DYNAMIC_LIBRARIES="dlls/hl_emscripten_wasm32.so"
ENV FILES_MAP="dlls/hl_emscripten_wasm32.so:valve/dlls/hl_emscripten_wasm32.wasm"

# Start server
ENTRYPOINT ["./xash", "+ip", "0.0.0.0", "-port", "27015"]

# Default start parameters
CMD ["+map crossfire", "+maxplayers", "16"]