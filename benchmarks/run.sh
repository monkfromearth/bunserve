#!/bin/bash

# BunServe Benchmark Runner
# Compares BunServe against Express, Hono, Elysia, and raw Bun.serve

set -e

FRAMEWORKS=("bunserve" "raw-bun" "express" "hono" "elysia")
TEST_TYPES=("load-test" "stress-test" "spike-test")
RESULTS_DIR="benchmarks/results"
PORT=3000

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create results directory
mkdir -p "$RESULTS_DIR"

# Function to wait for server to be ready
wait_for_server() {
    echo "Waiting for server to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:$PORT/ > /dev/null 2>&1; then
            echo "Server is ready!"
            return 0
        fi
        sleep 1
    done
    echo "Server failed to start"
    return 1
}

# Function to run benchmark for a framework
run_benchmark() {
    local framework=$1
    local test_type=$2

    echo -e "${BLUE}===================================${NC}"
    echo -e "${BLUE}Testing: ${GREEN}$framework${BLUE} with ${YELLOW}$test_type${NC}"
    echo -e "${BLUE}===================================${NC}"

    # Start the server
    echo "Starting $framework server..."
    bun benchmarks/servers/${framework}.ts > /dev/null 2>&1 &
    local server_pid=$!

    # Wait for server to be ready
    if ! wait_for_server; then
        echo "Failed to start $framework server"
        kill $server_pid 2>/dev/null || true
        return 1
    fi

    # Run k6 test
    echo "Running $test_type..."
    k6 run \
        --out json="$RESULTS_DIR/${framework}-${test_type}.json" \
        --summary-export="$RESULTS_DIR/${framework}-${test_type}-summary.json" \
        benchmarks/scripts/${test_type}.js

    # Stop the server
    echo "Stopping $framework server..."
    kill $server_pid 2>/dev/null || true
    sleep 2

    echo ""
}

# Function to run all benchmarks
run_all() {
    local test_type=${1:-"load-test"}

    echo -e "${GREEN}Running benchmarks for all frameworks${NC}"
    echo -e "${YELLOW}Test type: $test_type${NC}"
    echo ""

    for framework in "${FRAMEWORKS[@]}"; do
        run_benchmark "$framework" "$test_type"
    done

    echo -e "${GREEN}All benchmarks completed!${NC}"
    echo -e "Results saved to: ${BLUE}$RESULTS_DIR${NC}"
}

# Function to run a specific framework
run_single() {
    local framework=$1
    local test_type=${2:-"load-test"}

    if [[ ! " ${FRAMEWORKS[@]} " =~ " $framework " ]]; then
        echo "Invalid framework: $framework"
        echo "Available frameworks: ${FRAMEWORKS[*]}"
        exit 1
    fi

    run_benchmark "$framework" "$test_type"
}

# Function to display help
show_help() {
    echo "BunServe Benchmark Runner"
    echo ""
    echo "Usage:"
    echo "  ./benchmarks/run.sh all [test-type]          Run all frameworks"
    echo "  ./benchmarks/run.sh <framework> [test-type]  Run specific framework"
    echo "  ./benchmarks/run.sh help                     Show this help"
    echo ""
    echo "Frameworks:"
    echo "  bunserve   - BunServe (this library)"
    echo "  raw-bun    - Raw Bun.serve"
    echo "  express    - Express.js"
    echo "  hono       - Hono"
    echo "  elysia     - Elysia"
    echo ""
    echo "Test Types:"
    echo "  load-test   - Standard load test (default)"
    echo "  stress-test - Stress test with increasing load"
    echo "  spike-test  - Spike test with sudden traffic bursts"
    echo ""
    echo "Examples:"
    echo "  ./benchmarks/run.sh all                 # Run load-test for all frameworks"
    echo "  ./benchmarks/run.sh all stress-test     # Run stress-test for all frameworks"
    echo "  ./benchmarks/run.sh bunserve            # Run load-test for BunServe"
    echo "  ./benchmarks/run.sh express spike-test  # Run spike-test for Express"
}

# Main script
case "${1:-all}" in
    all)
        run_all "${2:-load-test}"
        ;;
    help|-h|--help)
        show_help
        ;;
    *)
        run_single "$1" "${2:-load-test}"
        ;;
esac
