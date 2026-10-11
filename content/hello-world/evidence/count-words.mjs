const line = "Every picture moves when the voice says its word";
const words = line.split(" ");
console.log(words.length, "words");
const longest = [...words].sort((a, b) => b.length - a.length)[0];
console.log("longest:", longest);
