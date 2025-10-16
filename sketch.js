let balls = []; 
let num = 5;

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.position(0, 0);
  canvas.style('z-index', '-1');
  
  for (let i=0; i<num; i++) {
    let x = random(width);
    let y = random(height);
    let r = random(1000, 400);
    balls[i] = new Circle(x, y, r);
  }
}

function draw() {
  background(255);
  
  for (let i=0; i<num; i++) {
    balls[i].update();
    balls[i].display();
  }
}

// This ensures the canvas resizes when window is resized
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}