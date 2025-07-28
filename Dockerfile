# ── Usa Nginx para servir seu build Angular (pré‑gerado em dist/app) ──
FROM nginx:alpine

# Remove os arquivos default do Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copia tudo de dist/app/browser diretamente para a raiz do Nginx
COPY dist/app/browser/. /usr/share/nginx/html/

# Exponha a porta 80
EXPOSE 80

# Inicie o Nginx em foreground
CMD ["nginx", "-g", "daemon off;"]