./copy.sh && \
PV_ACCESS_KEY="$1" cargo test && \
PV_ACCESS_KEY="$1" cargo test --release
