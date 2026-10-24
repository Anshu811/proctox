export const codingExam = {
  title: "CS302: Algorithms & Data Structures",
  type: "Coding Lab",
  durationMinutes: 90,
  maxViolations: 3,
};

export const problems = [
  {
    id: "p1",
    short: "P1: Two Sum",
    title: "Problem 1: Two Sum",
    difficulty: "Easy",
    points: 40,
    tags: ["Array", "Hash Map"],
    description: [
      "Given an array of N integers and a target value, find two different indices i and j such that arr[i] + arr[j] = target.",
      "Print the two indices (0-based, smaller first). It is guaranteed that exactly one answer exists.",
    ],
    constraints: [
      "2 ≤ N ≤ 100,000",
      "-10^9 ≤ arr[i] ≤ 10^9",
      "Time Limit: 1.0s • Memory Limit: 256 MB",
    ],
    samples: [
      {
        title: "Sample 1",
        input: "4 9\n2 7 11 15",
        output: "0 1",
        note: "arr[0] + arr[1] = 2 + 7 = 9",
      },
      {
        title: "Sample 2",
        input: "3 6\n3 2 4",
        output: "1 2",
        note: "arr[1] + arr[2] = 2 + 4 = 6",
      },
    ],
    hiddenCount: 4,
    starter: {
      cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n, target;
    cin >> n >> target;
    vector<int> arr(n);
    for (int i = 0; i < n; i++) cin >> arr[i];

    // Write your code here

    return 0;
}
`,
      python: `n, target = map(int, input().split())
arr = list(map(int, input().split()))

# Write your code here
`,
    },
  },
  {
    id: "p2",
    short: "P2: Shortest Path in DAG",
    title: "Problem 2: Shortest Path in a DAG",
    difficulty: "Medium",
    points: 60,
    tags: ["Graph", "Topological Sort", "DP"],
    description: [
      "Given a directed acyclic graph with V vertices (0 to V-1) and E weighted edges (u, v, w), find the shortest distance from a source vertex to every other vertex.",
      "Weights can be negative. If a vertex is not reachable from the source, print -1 for it.",
    ],
    constraints: [
      "1 ≤ V ≤ 100,000 • 1 ≤ E ≤ 200,000",
      "-1,000 ≤ w ≤ 10,000",
      "Time Limit: 1.0s (C++) • 2.0s (Python)",
    ],
    samples: [
      {
        title: "Sample 1",
        input: "6 7 0\n0 1 2\n0 4 1\n1 2 3\n4 2 2\n4 5 4\n2 3 6\n5 3 1",
        output: "0 2 3 6 1 5",
        note: "Best path to vertex 3 is 0 → 4 → 5 → 3 with cost 6.",
      },
      {
        title: "Sample 2",
        input: "4 4 1\n1 2 5\n1 3 2\n3 2 -4\n0 1 10",
        output: "-1 0 -2 2",
        note: "Vertex 0 is unreachable. Vertex 2 via 1 → 3 → 2 gives -2.",
      },
    ],
    hiddenCount: 5,
    starter: {
      cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int V, E, src;
    cin >> V >> E >> src;

    // Write your code here

    return 0;
}
`,
      python: `V, E, src = map(int, input().split())
edges = []
for _ in range(E):
    u, v, w = map(int, input().split())
    edges.append((u, v, w))

# Write your code here
`,
    },
  },
];