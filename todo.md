In the viewer/any main app: (editor etc) we need:
  - kernel 
  - any parsers we need [1..n]
  - any storage system we need [1..n]

Steps to get a clean build/release circle:
 - find best way to handle dependency inclusion : bower/ browserify / requirejs ?
 - how to include libs that have dependencies themselves:  for example amf parser depends on zip && sax libs
    - since those libs might be reused elsewhere , using an already "built" version of the AMFParser wich includes zip & sax might not be for the best (duplication !!)
 - logical groupings of files to be concatenated : ideally along the lines of parsers/stores/kernel
