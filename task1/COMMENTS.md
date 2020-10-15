What I infer from the original version:
- The intention is to calculate the sum of all integers between two numbers.
- The author was trying to use threads to split the calculation.

Problems with original version:
- Code is aesthetically painful to read. Messy indentation, naming is mixed between lower case and upper case.
- Usage of worker thread is an acceptable choice for this kind of CPU-bound tasks. However overusing promises is not a good idea, since this task has no I/O operation.
- Lots of off-by-1 errors when calculating sum on workers, which leads to double counting.
- Reassignment of constant in few places.
- Redundant logic in partSum() - the case where min > max is not reachable.
- Mixed usage of single and double quote in strings.
- Many places can be simplified using ES6 features such as object shorthands and using let/const instead of var.
- Overriding the original input (min) in many places without saving it somewhere first. This is not a good practice as we might need to refer to the original value at some point.

What I did in my version:
- Remove usages of promise
- Simplify logic to partition different segments to worker.
- Fix off-by-1 errors that leads to double counting.
- Provide a function that directly calculates the sum using the formula, to double check.

In general I still like the worker thread approach and did learn something new from it. We just need to be careful not overuse things like promises etc, and try to keep the code clean :)