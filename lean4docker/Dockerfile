FROM ubuntu:22.04

RUN apt-get update && \
    apt-get install -y git curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    curl https://elan.lean-lang.org/elan-init.sh -sSf | sh -s -- -y && \
    source "$HOME/.elan/env"

ENV PATH="$HOME/.elan/bin:$PATH"

WORKDIR /workspace

CMD ["/bin/bash"]