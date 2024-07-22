// sorry for ugly code

const fuzz = 1/64;
const fuzzier = 1/256;
const fuzziest = 1/8192;

const tau   = 6.283185307179586476925286766559005768394338798750211641949889184615632;
const pi    = 3.14159265358979323846264338327950288419716939937510;

var keysPressed = {"escape": false,"f1": false,"f2": false,"f3": false,"f4": false,"f5": false,"f6": false,"f7": false,"f8": false,"f9": false,"f10": false,"f11": false,"f12": false,"delete": false,"`": false,"1": false,"2": false,"3": false,"4": false,"5": false,"6": false,"7": false,"8": false,"9": false,"0": false,"-": false,"=": false,"backspace": false,"home": false,"~": false,"!": false,"@": false,"#": false,"$": false,"%": false,"^": false,"&": false,"*": false,"(": false,")": false,"_": false,"+": false,"tab": false,"q": false,"w": false,"e": false,"r": false,"t": false,"y": false,"u": false,"i": false,"o": false,"p": false,"[": false,"]": false,"\\": false,"pageup": false,"{": false,"}": false,"|": false,"capslock": false,"a": false,"s": false,"d": false,"f": false,"g": false,"h": false,"j": false,"k": false,"l": false,";": false,"'": false,"enter": false,"pagedown": false,":": false,"\"": false,"shift": false,"z": false,"x": false,"c": false,"v": false,"b": false,"n": false,"m": false,",": false,".": false,"/": false,"end": false,"<": false,">": false,"?": false,"control": false,"alt": false," ": false,"arrowup": false,"arrowleft": false,"arrowdown": false,"arrowright": false}; // only keys on my laptop keyboard, you might want to extend this

const SHIFTED_KEYS = {"`": "~","1": "!","2": "@","3": "#","4": "$","5": "%","6": "^","7": "&","8": "*","9": "(","0": ")","-": "_","=": "+","[": "{","]": "}","\\": "|",";": ":","'": "\"",",": "<",".": ">","": "?"};

var gravity = {"x": 0, "y": 0.5};
var air     = {"drag": 0.98, "vx": 0, "vy": 0, "swim": false};

function key_down(key) {
  key = key.toLowerCase();
  keysPressed[key] = true;
}

function key_up(key) {
  key = key.toLowerCase();
  keysPressed[key] = false;
  
  // handles the case of shift pressed, num key pressed, shift up, num key up
  if (key in SHIFTED_KEYS) {
    keysPressed[SHIFTED_KEYS[key]] = false;
  }
}

// uhh just for mathematical clarity i guess
function dot(x1, y1, x2, y2) {
  return x1*x2 + y1*y2;
}

function magsq(x, y) {
  return x*x + y*y;
}

function mag(x, y) {
  return Math.sqrt(magsq(x, y));
}

function lensq(x1, y1, x2, y2) {
  let dx = x1 - x2;
  let dy = y1 - y2;
  return dx*dx + dy*dy;
}

function len(x1, y1, x2, y2) {
  return Math.sqrt(lensq(x1, y1, x2, y2));
}

function normalize(x, y) {
  let l = mag(x, y);
  return l == 0 ? [0, 0] : [x/l, y/l];
}

function proj(ax, ay, px, py) {
  let proj = dot(ax, ay, px, py);
  let pp   = magsq(px, py);
  return [(proj * px)/pp, (proj * py)/pp];
}

function projnorm(ax, ay, px, py) {
  let proj = dot(ax, ay, px, py);
  return [proj * px, proj * py];
}

function reverse_proj(px, py, nx, ny) {
  if (px != 0 || py != 0) {
    let orig = dot(px, py, px, py) / dot(px, py, nx, ny);
    return [orig * nx, orig * ny]
  } else {
    return [0, 0];
  }
}

function reject(ax, ay, px, py) {
  let proj = dot(ax, ay, px, py);
  let pp   = magsq(px, py);
  return [ax - (proj * px)/pp, ay - (proj * py)/pp];
}

function rejectnorm(ax, ay, px, py) {
  let proj = dot(ax, ay, px, py);
  return [ax - (proj * px), ay - (proj * py)];
}

function lines_intersect(x11, y11, x12, y12, x21, y21, x22, y22, bounded1, bounded2) {
  let dx1 = x12 - x11;
  let dy1 = y12 - y11;
  let dx2 = x22 - x21;
  let dy2 = y22 - y21;
  
  let denom = dx1*dy2 - dy1*dx2
  let x;
  let y;
  
  if (denom == 0) {
    // if denominator is 0, either one or both lines is a point or lines are parallel
    
    if (dx1 == 0 && dy1 == 0) {
      if (dx2 == 0 && dy2 == 0) {
        // both l1 and l2 are points
        if (x11 == x21 && y11 == y21) {
          return {"x": x11, "y": y11};
        } else {
          return undefined;
        }
      } else {
        // l1 is a point
        if (dx2*(y11 - y21) - dy2*(x11 - x21) == 0) {
          x = x11;
          y = y11;
        } else {
          return undefined;
        }
      }
    } else if (dx2 == 0 && dy2 == 0) {
      // l2 is a point
      if (dx1*(y21 - y11) - dy1*(x21 - x11) == 0) {
          x = x21;
          y = y21;
        } else {
          return undefined;
        }
    } else {
      // neither line is a point, they are parallel
      // so if they intersect they have infinite intersections but let's pretend they don't
      
      return undefined;
    }
  } else {
    // lines are nonparallel, the non-annoying case
    let c1 = x21*dy2 - y21*dx2; 
    let c2 = y11*dx1 - x11*dy1;
    
    x = (c1*dx1 + c2*dx2) / denom;
    y = (c1*dy1 + c2*dy2) / denom;
  }
  
  let inBounds = true;
  
  if (bounded1) {
    inBounds = inBounds && (!((x > x11 && x > x12) || (x < x11 && x < x12)) || (x11 == x12));
    inBounds = inBounds && (!((y > y11 && y > y12) || (y < y11 && y < y12)) || (y11 == y12));
  }
  
  if (bounded2) {
    inBounds = inBounds && (!((x > x21 && x > x22) || (x < x21 && x < x22)) || (x21 == x22));
    inBounds = inBounds && (!((y > y21 && y > y22) || (y < y21 && y < y22)) || (y21 == y22));
  }
  
  if (inBounds) {
    return {"x": x, "y": y};
  } else {
    return undefined; // no intersection point in bounds
  }
}

// https://mathworld.wolfram.com/Circle-LineIntersection.html
function line_circle_intersect(x1, y1, x2, y2, xc, yc, r, bounded, firstOnly) {
  let dx = x2 - x1;
  let dy = y2 - y1;
  let dr2 = magsq(dx, dy);
  let D = (x1 - xc) * (y2 - yc) - (x2 - xc) * (y1 - yc);
  let disc = r*r * dr2 - D*D;
  
  let result1 = undefined;
  let result2 = undefined;
  
  if (disc < 0) {
    return undefined;
  } else if (disc > 0) {
    let signdy = dy == 0 ? 1 : Math.sign(dy)
   
    let rx1 = (D * dy + signdy * dx * Math.sqrt(disc)) / dr2 + xc;
    let rx2 = (D * dy - signdy * dx * Math.sqrt(disc)) / dr2 + xc;
    let ry1 = (-D * dx + Math.abs(dy) * Math.sqrt(disc)) / dr2 + yc;
    let ry2 = (-D * dx - Math.abs(dy) * Math.sqrt(disc)) / dr2 + yc;
    
    if (firstOnly) {
      if (lensq(x1, y1, rx1, ry1) > lensq(x1, y1, rx2, ry2)) {
        result1 = {"x": rx2, "y": ry2};
      } else {
        result1 = {"x": rx1, "y": ry1};
      }
    } else {
      result1 = {"x": rx1, "y": ry1};
      result2 = {"x": rx2, "y": ry2};
    }
  } else {
    // floating point math says this probably won't happen, though...
    if (firstOnly) {
      result1 = {"x": (D * dy) / dr2 + xc, "y": (-D * dx) / dr2 + yc};
    } else {
      result1 = {"x": (D * dy) / dr2 + xc, "y": (-D * dx) / dr2 + yc};
    }
  }
  
  let inBounds1 = true;
  let inBounds2 = true;
  
  if (bounded) {
    if (result1 != undefined) {
      inBounds1 = inBounds1 && (!((result1.x > x1 && result1.x > x2) || (result1.x < x1 && result1.x < x2)) || (x1 == x2));
      inBounds1 = inBounds1 && (!((result1.y > y1 && result1.y > y2) || (result1.y < y1 && result1.y < y2)) || (y1 == y2));
    }
    
    if (result2 != undefined) {
      inBounds2 = inBounds2 && (!((result2.x > x1 && result2.x > x2) || (result2.x < x1 && result2.x < x2)) || (x1 == x2));
      inBounds2 = inBounds2 && (!((result2.y > y1 && result2.y > y2) || (result2.y < y1 && result2.y < y2)) || (y1 == y2));
    }
  }
  
  if (firstOnly) {
    return inBounds1 ? result1 : undefined;
  } else {
    return (result1 != undefined && inBounds1) ?
                 ((result2 != undefined && inBounds2) ? [result1, result2] : [result1])
               : ((result2 != undefined && inBounds2) ? [result2] : []);
  }
    
}

function moving_circle_intersect(x1, y1, r1, vx1, vy1, x2, y2, r2, vx2, vy2, bounded) {
  //basically we consider circle 1 to be the moving one (relative to circle 2)
  //which does make the answer technically wrong but it's right with respect to
  //how motion is handled in this engine, so, woo
  
  let vx = vx1 - vx2;
  let vy = vy1 - vy2;
  
  if (vx == 0 && vy == 0) return [undefined, undefined, undefined];
  
  let dist = r1 + r2;
  
  let [perpx, perpy] = reject(x1 - x2, y1 - y2, vx, vy);
  let perpsq = magsq(perpx, perpy);
  
  let parsq = dist*dist - perpsq;
  
  if (parsq < 0) return [undefined, undefined, undefined];
  
  let par = Math.sqrt(parsq);
  
  let [parx, pary] = normalize(vx, vy);
  parx *= par;
  pary *= par;
  
  let interx = parx + perpx;
  let intery = pary + perpy;
  
  if (mag(interx + x2 - x1, intery + y2 - y1) < mag(vx, vy) || !bounded) {
    // first: intended intersection point with circle 2 static,
    // second: the point on circle 1 (at its starting location) that will move to intersection point,
    // third: norm
    return [{"x": x2 + interx * r2 / dist, "y": y2 + intery * r2 / dist},
            {"x": x1 - interx * r1 / dist, "y": y1 - intery * r1 / dist},
            {"x": interx / dist, "y": intery / dist}];
  } else {
    return [undefined, undefined, undefined];
  }
}

// kinda wish i didn't have to make this one ngl
class Line {
  #nx;
  #ny;
  #nxp;
  #nyp;
  
  constructor (x1, y1, x2, y2, bounded, parent) {
    this.parent = parent;
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.bounded = bounded;
    
    this.#set_normals(); 
  }
  
  #set_normals() {
    [this.#nx, this.#ny] = normalize(this.y1 - this.y2, this.x2 - this.x1);
    [this.#nxp, this.#nyp] = normalize(this.x2 - this.x1, this.y2 - this.y1);
  }
  
  set_pts(set1, set2, x1, y1, x2, y2, calcNorm) {
    if (set1) {
      this.x1 = x1;
    }
    
    if (set2) {
      this.x2 = x2;
    }
    
    if ((set1 || set2) && calcNorm) {
      this.#set_normals();
    }
  }
  
  intersect_line(x11, y11, x12, y12, bounded) {
    let temp;
    let pts = [];
    
    temp = lines_intersect(x11, y11, x12, y12, this.x1, this.y1, this.x2, this.y2, bounded, this.bounded);
    
    if (temp != undefined) {
      temp.parent = this.parent;
      temp.norm = {"x": this.#nx, "y": this.#ny};
      pts.push(temp);
    }
    
    return pts;
  }
  
  get_pts() {
    return [{"x": this.x1, "y": this.y1}, {"x": this.x2, "y": this.y2}];
  }
  
  get_norms() {
    return [{"x": this.#nx, "y": this.#ny}, {"x": this.#nxp, "y": this.#nyp}];
  }
  
  get_all_norms() {
    return this.get_norms();
  }
  
  get_proj_profile(norm) {
    let temp;
    let minpt =  Infinity;
    let maxpt = -Infinity;
    
    temp = dot(this.x1, this.y1, norm.x, norm.y);
    minpt = Math.min(temp, minpt);
    maxpt = Math.max(temp, maxpt);
    temp = dot(this.x2, this.y2, norm.x, norm.y);
    minpt = Math.min(temp, minpt);
    maxpt = Math.max(temp, maxpt);
    
    return [minpt, maxpt];
  }
}

class Tri {
  #flippedNormals;
  
  #nx1;
  #ny1;
  #nx2;
  #ny2;
  #nx3;
  #ny3;
  
  constructor(x1, y1, x2, y2, x3, y3, parent) {
    this.parent = parent; // the hitbox object that owns/created this shape.
    
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.x3 = x3;
    this.y3 = y3;
    
    [this.#nx1, this.#ny1] = normalize(y1 - y2, x2 - x1);
    [this.#nx2, this.#ny2] = normalize(y2 - y3, x3 - x2);
    [this.#nx3, this.#ny3] = normalize(y3 - y1, x1 - x3);
    
    this.#flippedNormals = dot(this.x3 - this.x1, this.y3 - this.y1, this.#nx1, this.#ny1) > 0;
    
    if (this.#flippedNormals) {
      this.#nx1 *= -1;
      this.#ny1 *= -1;
      this.#nx2 *= -1;
      this.#ny2 *= -1;
      this.#nx3 *= -1;
      this.#ny3 *= -1;
    }
    
  }
  
  set_pts(set1, set2, set3, x1, y1, x2, y2, x3, y3, calcNorms) {
    if (set1) {
      this.x1 = x1;
      this.y1 = y1;
    }
    
    if (set2) {
      this.x2 = x2;
      this.y2 = y2;
    }
    
    if (set3) {
      this.x3 = x3;
      this.y3 = y3;
    }
     
    // a lot of the time, the triangle might just be moved-
    // in that case, don't waste any effort
    if (calcNorms) {
      let flipped = [this.#flippedNormals, this.#flippedNormals, this.#flippedNormals];
      
      if (set1 || set2) {
        [this.#nx1, this.#ny1] = normalize(this.y1 - this.y2, this.x2 - this.x1);
        flipped[0] = false;
      }
      
      if (set2 || set3) {
        [this.#nx2, this.#ny2] = normalize(this.y2 - this.y3, this.x3 - this.x2);
        flipped[1] = false;
      }
       
      if (set3 || set1) {
        [this.#nx3, this.#ny3] = normalize(this.y3 - this.y1, this.x1 - this.x3);
        flipped[2] = false;
      }
      
      this.#flippedNormals = dot(this.x3 - this.x1, this.y3 - this.y1, this.#nx1, this.#ny1) > 0;

      if (set1 || set2 || set3) {
        this.#nx1 *= (flipped[0] == this.#flippedNormals) ? 1 : -1;
        this.#ny1 *= (flipped[0] == this.#flippedNormals) ? 1 : -1;
        this.#nx2 *= (flipped[1] == this.#flippedNormals) ? 1 : -1;
        this.#ny2 *= (flipped[1] == this.#flippedNormals) ? 1 : -1;
        this.#nx3 *= (flipped[2] == this.#flippedNormals) ? 1 : -1;
        this.#ny3 *= (flipped[2] == this.#flippedNormals) ? 1 : -1;
      }
    }
    
  }
  
  intersect_line(x11, y11, x12, y12, bounded) {
    let temp;
    let pts = [];
    
    temp = lines_intersect(x11, y11, x12, y12, this.x1, this.y1, this.x2, this.y2, bounded, true);
    
    if (temp != undefined) {
      temp.parent = this.parent;
      temp.norm = {"x": this.#nx1, "y": this.#ny1};
      pts.push(temp);
    }
     
    temp = lines_intersect(x11, y11, x12, y12, this.x2, this.y2, this.x3, this.y3, bounded, true);
    
    if (temp != undefined) {
      temp.parent = this.parent;
      temp.norm = {"x": this.#nx2, "y": this.#ny2};
      pts.push(temp);
    }
    
    temp = lines_intersect(x11, y11, x12, y12, this.x3, this.y3, this.x1, this.y1, bounded, true);
    
    if (temp != undefined) {
      temp.parent = this.parent;
      temp.norm = {"x": this.#nx3, "y": this.#ny3};
      pts.push(temp);
    }
    
    return pts;
  }
  
  get_pts() {
    return [{"x": this.x1, "y": this.y1}, {"x": this.x2, "y": this.y2}, {"x": this.x3, "y": this.y3}];
  }
  
  get_norms() {
    return [{"x": this.#nx1, "y": this.#ny1}, {"x": this.#nx2, "y": this.#ny2}, {"x": this.#nx3, "y": this.#ny3}];
  }
  
  get_all_norms() {
    return this.get_norms();
  }
  
  get_proj_profile(norm) {
    let temp;
    let minpt =  Infinity;
    let maxpt = -Infinity;
    
    temp = dot(this.x1, this.y1, norm.x, norm.y);
    minpt = Math.min(temp, minpt);
    maxpt = Math.max(temp, maxpt);
    temp = dot(this.x2, this.y2, norm.x, norm.y);
    minpt = Math.min(temp, minpt);
    maxpt = Math.max(temp, maxpt);
    temp = dot(this.x3, this.y3, norm.x, norm.y);
    minpt = Math.min(temp, minpt);
    maxpt = Math.max(temp, maxpt);
    
    return [minpt, maxpt];
  }
}

class Rect {
  constructor(x, y, w, h, parent) {
    this.parent = parent;
    
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }
  
  reset(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }
  
  resize(w, h) {
    this.w = w;
    this.h = h;
  }
  
  moveto(x, y) {
    this.x = x;
    this.y = y;
  }
  
  intersect_line(x11, y11, x12, y12, bounded) {
    let temp;
    let pts = [];
    
    let x = this.x;
    let y = this.y;
    let xw = x + this.w;
    let yh = y + this.h;
    
    temp = lines_intersect(x11, y11, x12, y12, x, y, xw, y, bounded, true);
    
    if (temp != undefined) {
      temp.parent = this.parent;
      temp.norm = {"x":0, "y":-1};
      pts.push(temp);
    }
    
    temp = lines_intersect(x11, y11, x12, y12, xw, y, xw, yh, bounded, true);
    
    if (temp != undefined) {
      temp.parent = this.parent;
      temp.norm = {"x": 1, "y": 0};
      pts.push(temp);
    }
    
    temp = lines_intersect(x11, y11, x12, y12, xw, yh, x, yh, bounded, true);
    
    if (temp != undefined) {
      temp.parent = this.parent;
      temp.norm = {"x": 0, "y": 1};
      pts.push(temp);
    }
    
    temp = lines_intersect(x11, y11, x12, y12, x, yh, x, y, bounded, true);
    
    if (temp != undefined) {
      temp.parent = this.parent;
      temp.norm = {"x": -1, "y": 0};
      pts.push(temp);
    }
    
    return pts;
  }
  
  get_pts() {
    return [{"x": this.x, "y": this.y}, {"x": this.x + this.w, "y": this.y},
            {"x": this.x + this.w, "y": this.y + this.h}, {"x": this.x, "y": this.y + this.h}];
  }
  
  get_norms() {
    return [{"x": 0, "y": 1}, {"x": 1, "y": 0}];
  }
  
  // when norm direction matters so we need both of each pair 
  get_all_norms() {
    return [{"x": 0, "y": 1}, {"x": 1, "y": 0},
            {"x": 0, "y": -1}, {"x": -1, "y": 0}];
  }
  
  get_proj_profile(norm) {
    let temp;
    let minpt =  Infinity;
    let maxpt = -Infinity;
    
    let xw = this.x + this.w;
    let yh = this.y + this.h;
    
    temp = dot(this.x, this.y, norm.x, norm.y);
    minpt = Math.min(temp, minpt);
    maxpt = Math.max(temp, maxpt);
    temp = dot(xw, this.y, norm.x, norm.y);
    minpt = Math.min(temp, minpt);
    maxpt = Math.max(temp, maxpt);
    temp = dot(xw, yh, norm.x, norm.y);
    minpt = Math.min(temp, minpt);
    maxpt = Math.max(temp, maxpt);
    temp = dot(this.x, yh, norm.x, norm.y);
    minpt = Math.min(temp, minpt);
    maxpt = Math.max(temp, maxpt);
    
    return [minpt, maxpt];
  }
}

class RotRect {
  #x1base;
  #y1base;
  #x2base;
  #y2base;
  #x3base;
  #y3base;
  #x4base;
  #y4base;
  #cosa;
  #sina;
  
  #nx1;
  #ny1;
  #nx2;
  #ny2;
  #nx3;
  #ny3;
  #nx4;
  #ny4;
  
  constructor(xc, yc, w, h, a, parent) {
    // x and y are center points for this fella
    this.parent = parent;
    
    this.xc = xc;
    this.yc = yc;
    this.w = w;
    this.h = h;
    this.a = a;
    
    this.#cosa = Math.cos(this.a);
    this.#sina = Math.sin(this.a);
    
    this.gen_pts();
    this.gen_norms();
  }
  
  gen_pts() {
    let wcosa = this.w * this.#cosa / 2;
    let wsina = this.w * this.#sina / 2;
    let hcosa = this.h * this.#cosa / 2;
    let hsina = this.h * this.#sina / 2;
    
    
    this.#x1base = -wcosa + hsina;
    this.#y1base = -wsina - hcosa;
    this.#x2base =  wcosa + hsina;
    this.#y2base =  wsina - hcosa;
    this.#x3base =  wcosa - hsina;
    this.#y3base =  wsina + hcosa;
    this.#x4base = -wcosa - hsina;
    this.#y4base = -wsina + hcosa;
    
    this.moveto(this.xc, this.yc);
  }
  
  gen_norms() {
    this.#nx1 =  this.#sina;
    this.#ny1 = -this.#cosa;
    this.#nx2 =  this.#cosa;
    this.#ny2 =  this.#sina;
    this.#nx3 = -this.#sina;
    this.#ny3 =  this.#cosa;
    this.#nx4 = -this.#cosa;
    this.#ny4 = -this.#sina;
  }
  
  reset(xc, yc, w, h, a) {
    this.xc = xc;
    this.yc = yc;
    this.w = w;
    this.h = h;
    this.a = a;
    
    this.#cosa = Math.cos(this.a);
    this.#sina = Math.sin(this.a);
    
    this.gen_pts();
    this.gen_norms();
  }
  
  rotate(a) {
    this.a = a;
    this.#cosa = Math.cos(this.a);
    this.#sina = Math.sin(this.a);
    
    this.gen_pts();
    this.gen_norms();
  }
  
  resize(w, h) {
    this.w = w;
    this.h = h;
    
    gen_pts();
  }
  
  moveto(xc, yc) {
    this.xc = xc;
    this.yc = yc;
    this.x1 = this.xc + this.#x1base;
    this.y1 = this.yc + this.#y1base;
    this.x2 = this.xc + this.#x2base;
    this.y2 = this.yc + this.#y2base;
    this.x3 = this.xc + this.#x3base;
    this.y3 = this.yc + this.#y3base;
    this.x4 = this.xc + this.#x4base;
    this.y4 = this.yc + this.#y4base;
  }
  
  intersect_line(x11, y11, x12, y12, bounded) {
    let temp;
    let pts = [];
    
    temp = lines_intersect(x11, y11, x12, y12, this.x1, this.y1, this.x2, this.y2, bounded, true);
    
    if (temp != undefined) {
      temp.parent = this.parent;
      temp.norm = {"x": this.#nx1, "y": this.#ny1};
      pts.push(temp);
    }
    
    temp = lines_intersect(x11, y11, x12, y12, this.x2, this.y2, this.x3, this.y3, bounded, true);
    
    if (temp != undefined) {
      temp.parent = this.parent;
      temp.norm = {"x": this.#nx2, "y": this.#ny2};
      pts.push(temp);
    }
     
    temp = lines_intersect(x11, y11, x12, y12, this.x3, this.y3, this.x4, this.y4, bounded, true);
     
    if (temp != undefined) {
      temp.parent = this.parent;
      temp.norm = {"x": this.#nx3, "y": this.#ny3};
      pts.push(temp);
    }
    
    temp = lines_intersect(x11, y11, x12, y12, this.x4, this.y4, this.x1, this.y1, bounded, true);
    
    if (temp != undefined) {
      temp.parent = this.parent;
      temp.norm = {"x": this.#nx4, "y": this.#ny4};
      pts.push(temp);
    }
    
    return pts;
  }
  
  get_pts() {
    return [{"x": this.x1, "y": this.y1}, {"x": this.x2, "y": this.y2},
            {"x": this.x3, "y": this.y3}, {"x": this.x4, "y": this.y4}];
  }
  
  get_norms() {
    return [{"x": this.#nx1, "y": this.#ny1}, {"x": this.#nx2,"y": this.#ny2}];
  }
  
  // when norm direction matters so we need both of each pair 
  get_all_norms() {
    return [{"x": this.#nx1, "y": this.#ny1}, {"x": this.#nx2,"y": this.#ny2},
            {"x": this.#nx3,"y": this.#ny3}, {"x": this.#nx4,"y": this.#ny4}];
  }
  
  get_proj_profile(norm) {
    let temp;
    let minpt =  Infinity;
    let maxpt = -Infinity;
    
    temp = dot(this.x1, this.y1, norm.x, norm.y);
    minpt = Math.min(temp, minpt);
    maxpt = Math.max(temp, maxpt);
    temp = dot(this.x2, this.y2, norm.x, norm.y);
    minpt = Math.min(temp, minpt);
    maxpt = Math.max(temp, maxpt);
    temp = dot(this.x3, this.y3, norm.x, norm.y);
    minpt = Math.min(temp, minpt);
    maxpt = Math.max(temp, maxpt);
    temp = dot(this.x4, this.y4, norm.x, norm.y);
    minpt = Math.min(temp, minpt);
    maxpt = Math.max(temp, maxpt);
    
    return [minpt, maxpt];
  }
}

// it is up to YOU to make sure it is convex and non-intersecting!!
class Poly {
  #flippedNormals;
  
  #normalsX;
  #normalsY;
  
  constructor(ptsX, ptsY, parent) {
    if (ptsX.length != ptsY.length || ptsX.length < 3) {
      console.log("illegal polygon point specification");
      return;
    }
    
    this.parent = parent;
    
    this.ptsX = ptsX;
    this.ptsY = ptsY;
    
    this.#normalsX = [];
    this.#normalsY = [];
    
    for (let i = 0; i < ptsX.length; i++) {
      let [tempX, tempY] = normalize(ptsY[i] - ptsY[(i + 1) % ptsX.length], ptsX[(i + 1) % ptsX.length] - ptsX[i]);
      
      this.#normalsX.push(tempX);
      this.#normalsY.push(tempY);
    }
    
    this.#flippedNormals = dot(ptsX[0] - ptsX[1], ptsY[0] - ptsY[1], this.#normalsX[2], this.#normalsY[2]) > 0;
    
    if (this.#flippedNormals) {
      for (let i in this.#normalsX) {
        this.#normalsX[i] *= -1;
        this.#normalsY[i] *= -1;
      }
    }
  }
  
  // can skip this on account of the point arrays can be edited from the outside
  set_pts(ptsX, ptsY, calcNorms) {
  
    if (ptsSet.length != this.ptsX.length || ptsX.length != this.ptsX.length || ptsY.length != this.ptsY.length) {
      console.log("illegal polygon point respecification");
      return;
    }
  
    for (let i = 0; i < this.ptsX.length; i++) {
      this.ptsX[i] = ptsX[i];
      this.ptsY[i] = ptsY[i];
    }
    
    if (calcNorms) {
      this.recalc_norms(setPts)
    }
  }
  
  recalc_norms() {
    for (let i = 0; i < this.ptsX.length; i++) {
      [this.#normalsX[i], this.#normalsY[i]] = normalize(this.ptsY[i] - this.ptsY[(i + 1) % this.ptsX.length],
                                                         this.ptsX[(i + 1) % this.ptsX.length] - this.ptsX[i]);
    }
    
    this.#flippedNormals = dot(this.ptsX[0] - this.ptsX[1], this.ptsY[0] - this.ptsY[1],
                               this.#normalsX[2], this.#normalsY[2]) > 0;
    
    for (let i = 0; i < this.ptsX.length; i++) {
      this.#normalsX[i] *= this.#flippedNormals ? -1 : 1;
      this.#normalsY[i] *= this.#flippedNormals ? -1 : 1;
    }
  }
  
  intersect_line(x11, y11, x12, y12, bounded) {
    let temp;
    let pts = [];
    
    for (let i = 0; i < this.ptsX.length; i++) {
      temp = lines_intersect(x11, y11, x12, y12, this.ptsX[i], this.ptsY[i], this.ptsX[(i + 1) % this.ptsX.length],
                             this.ptsY[(i + 1) % this.ptsX.length], bounded, true);
        
      if (temp != undefined) {
        temp.parent = this.parent;
        temp.norm = {"x": this.#normalsX[i], "y": this.#normalsY[i]};
        pts.push(temp);
      }
    }
    
    return pts;
  }
  
  get_pts() {
    let pts = [];
    
    for (let i = 0; i < this.ptsX.length; i++) {
      pts.push({"x": this.ptsX[i], "y": this.ptsY[i]});
    }
    
    return pts;
  }
  
  get_norms() {
    let norms = [];
    
    for (let i = 0; i < this.#normalsX.length; i++) {
      norms.push({"x": this.#normalsX[i], "y": this.#normalsY[i]});
    }
    
    return norms;
  }
  
  get_all_norms() {
    return this.get_norms();
  }
  
  get_proj_profile(norm) {
    let temp;
    let minpt =  Infinity;
    let maxpt = -Infinity;
    
    for (let i = 0; i < this.ptsX.length; i++) {
      temp = dot(this.ptsX[i], this.ptsY[i], norm.x, norm.y);
      minpt = Math.min(temp, minpt);
      maxpt = Math.max(temp, maxpt);
    }
    
    return [minpt, maxpt];
  }
}

class Circle {
  constructor(x, y, r, parent) {
    this.x = x;
    this.y = y;
    this.r = Math.abs(r);
    this.parent = parent;
  }
  
  moveto(x, y) {
    this.x = x;
    this.y = y;
  }
  
  resize(r) {
    this.r = Math.abs(r);
  }
  
  closest_pt(pts) {
    let closestPt;
    let minDist = Infinity;
    
    for (let pt of pts) {
      let temp = lensq(pt.x, pt.y, this.x, this.y);
      
      if (temp < minDist) {
        minDist = temp;
        closestPt = pt;
      }
    }
    
    return closestPt;
  }
  
  intersect_line(x11, y11, x12, y12, bounded) {
    let temp;
    let pts = [];
    
    temp = line_circle_intersect(x11, y11, x12, y12, this.x, this.y, this.r, bounded, true);
    
    if (temp != undefined) {
      temp.parent = this.parent;
      
      let [tempX, tempY] = normalize(temp.x - this.x, temp.y - this.y);
      
      temp.norm = {"x": tempX, "y": tempY};
      pts.push(temp);
    }
    
    return pts;
  }
  
  get_norms(pts) {
    let norms = [];
    
    let pt = this.closest_pt(pts);
    
    if (pt != undefined) {
      let [normX, normY] = normalize(pt.x - this.x, pt.y - this.y);
      norms.push({"x": normX, "y": normY});
    }
    
    return norms;
  }
  
  get_all_norms(pts) {
    return this.get_norms(pts);
  }
  
  get_pts(norms) {
    let pts = [];
    
    for (let norm of norms) {
      pts.push({"x": -norm.x * this.r + this.x, "y": -norm.y * this.r + this.y});
    }
    
    return pts;
  }
  
  get_proj_profile(norm) {
    let c = dot(this.x, this.y, norm.x, norm.y);
    return [c - this.r, c + this.r];
  }
}


// TODO ignore_func and collide func might generally need more arguments than these given, determine these in the future

// an ignore_func example
function one_way_platform(encountered, caller) {
  let g;
  let overlapping = true;
  
  if (caller.gravity == undefined) {
    g = gravity;
  } else {
    g = caller.gravity;
  }
  
  let bothCircles = false;
  let norms;
  
  if (encountered.shape instanceof Circle) {
    if (caller.shape instanceof Circle) {
      let [tempX, tempY] = normalize(caller.shape.x - encountered.shape.x, caller.shape.y - encountered.shape.y);
      norms = [{"x": tempX, "y": tempY}];
      bothCircles = true;
    } else {
      norms = encountered.shape.get_all_norms(caller.shape.get_pts());
    }
  } else {
    norms = encountered.shape.get_all_norms();
  } 
  
  for (let norm of norms) {
    if (dot(norm.x, norm.y, g.x, g.y) < 0) {
      let [encMinpt, encMaxpt] = encountered.get_proj_profile(norm, this.vx, this.vy);
      let [calMinpt, calMaxpt] = caller.get_proj_profile(norm, this.vx, this.vy);
      
      overlapping = overlapping && (encMaxpt > calMinpt);
    }
  }
  
  if ((encountered.shape instanceof Rect && caller.shape instanceof Rect) || bothCircles) {
    return overlapping;
  }
   
  if (caller.shape instanceof Circle) {  
    norms = caller.shape.get_all_norms(encountered.shape.get_pts());
  } else {
    norms = caller.shape.get_all_norms();
  }
    
  for (let norm of norms) {
    if (dot(norm.x, norm.y, g.x, g.y) > 0) {
      let [encMinpt, encMaxpt] = encountered.get_proj_profile(norm, this.vx, this.vy);
      let [calMinpt, calMaxpt] = caller.get_proj_profile(norm, this.vx, this.vy);
        
      overlapping = overlapping && (calMaxpt > encMinpt);
    }
  }
  
  return overlapping;
}

// a ground collideFunc example
function tipping_platform(encountered, caller, norm, vxChange, vyChange, rotContactPt) {
  let k = (encountered.k == undefined) ? 0.1 : encountered.k;
  let callerX = (rotContactPt == undefined) ? caller.x : rotContactPt.x;
  let callerY = (rotContactPt == undefined) ? caller.y : rotContactPt.y;
  
  let distX = callerX - encountered.xc - encountered.x;
  let distY = callerY - encountered.yc - encountered.y;
  
  // "mass" of the encountered object is really rotational inertia here
  let dva = dot(vxChange, vyChange, distY, -distX) * caller.mass / encountered.mass;
  
  encountered.va += dva;
}


// a sprite collideFunc example
function fluid_effect(encountered, caller, overlapResult) {
  caller.events.push({"type": "fluid", "obj": encountered.parent, "overlap": Math.abs(overlapResult.overlap / overlapResult.width)})
}


class Hitbox {
  #baseShape;
  #cosa;
  #sina;
  
  // drag needed only for sprites
  constructor(shape, parent, moves, rotates, x, y, vx, vy, mass, frict, elast,
              ignoreFunc, collideFunc) {
    this.parent = parent;
    this.moves = moves;
    this.rotates = rotates;
    
    this.#baseShape = shape;
    this.#baseShape.parent = this; // not necessary but whatever
    
    if (!rotates) {
      if (this.#baseShape instanceof Rect) {
        this.shape = new Rect(this.#baseShape.x + x, this.#baseShape.y + y, this.#baseShape.w, this.#baseShape.h, this);
      } else if (this.#baseShape instanceof Tri) {
        this.shape = new Tri(this.#baseShape.x1 + x, this.#baseShape.y1 + y, this.#baseShape.x2 + x,
                             this.#baseShape.y2 + y, this.#baseShape.x3 + x, this.#baseShape.y3 + y, this);
      } else if (this.#baseShape instanceof Line) {
        this.shape = new Line(this.#baseShape.x1 + x, this.#baseShape.y1 + y, this.#baseShape.x2 + x,
                              this.#baseShape.y2 + y, this.#baseShape.bounded, this);
      } else if (this.#baseShape instanceof RotRect) {
        this.shape = new RotRect(this.#baseShape.xc + x, this.#baseShape.yc + y, this.#baseShape.w, this.#baseShape.h,
                                 this.#baseShape.a, this);
      } else if (this.#baseShape instanceof Poly) {
        
        let ptsX = this.#baseShape.ptsX.slice();
        let ptsY = this.#baseShape.ptsY.slice();
        
        for (let i in ptsX) {
          ptsX[i] += x;
          ptsY[i] += y;
        }
        
        this.shape = new Poly(ptsX, ptsY, this);
        
      } else if (this.#baseShape instanceof Circle) {
        this.shape = new Circle(this.#baseShape.x + x, this.#baseShape.y + y, this.#baseShape.r, this);
      }
    }
    
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.movedX = 0;
    this.movedY = 0;
    
    this.mass = mass;

    this.frict = frict; // between 0 = 1, 0 is most friction, 1 least
    this.elast = elast; // between 0 and 1, 1 is bounciest and 0 least bouncy
    
    this.ignoreFunc  = ignoreFunc;
    this.collideFunc = collideFunc;
    
    this.ignoredGround = [];
    this.encounteredGround = [];
    this.encounteredSprites = [];
    this.events = [];
    
    this.onGround = false;
  }
  
  set_rot_params(xc, yc, a, va) {
    this.rotates = true;
    
    this.xc = xc;
    this.yc = yc;
    this.a = a;
    this.va = va;
    
    this.#sina = Math.sin(a);
    this.#cosa = Math.cos(a);
    
    if (this.#baseShape instanceof Rect) {
      let rotX =   this.#cosa * (this.#baseShape.x - this.#baseShape.w / 2 - xc)
                 - this.#sina * (this.#baseShape.y - this.#baseShape.h / 2 - yc) + xc  + this.x;
      let rotY =   this.#sina * (this.#baseShape.x - this.#baseShape.w / 2 - xc)
                 + this.#cosa * (this.#baseShape.y - this.#baseShape.h / 2 - yc) + yc  + this.x;
      
      this.shape = new RotRect(rotX, rotY, this.#baseShape.w, this.#baseShape.h, this.a, this);
    } else if (this.#baseShape instanceof Tri) {
      let rotX1 = this.#cosa * (this.#baseShape.x1 - xc) - this.#sina * (this.#baseShape.y1 - yc) + xc + this.x;
      let rotY1 = this.#sina * (this.#baseShape.x1 - xc) + this.#cosa * (this.#baseShape.y1 - yc) + yc + this.y;
      let rotX2 = this.#cosa * (this.#baseShape.x2 - xc) - this.#sina * (this.#baseShape.y2 - yc) + xc + this.x;
      let rotY2 = this.#sina * (this.#baseShape.x2 - xc) + this.#cosa * (this.#baseShape.y2 - yc) + yc + this.y;
      let rotX3 = this.#cosa * (this.#baseShape.x3 - xc) - this.#sina * (this.#baseShape.y3 - yc) + xc + this.x;
      let rotY3 = this.#sina * (this.#baseShape.x3 - xc) + this.#cosa * (this.#baseShape.y3 - yc) + yc + this.y;
      
      this.shape = new Tri(rotX1, rotY1, rotX2, rotY2, rotX3, rotY3, this);
    } else if (this.#baseShape instanceof Line) {
      let rotX1 = this.#cosa * (this.#baseShape.x1 - xc) - this.#sina * (this.#baseShape.y1 - yc) + xc + this.x;
      let rotY1 = this.#sina * (this.#baseShape.x1 - xc) + this.#cosa * (this.#baseShape.y1 - yc) + yc + this.y;
      let rotX2 = this.#cosa * (this.#baseShape.x2 - xc) - this.#sina * (this.#baseShape.y2 - yc) + xc + this.x;
      let rotY2 = this.#sina * (this.#baseShape.x2 - xc) + this.#cosa * (this.#baseShape.y2 - yc) + yc + this.y;
      
      this.shape = new Line(rotX1, rotY1, rotX2, rotY2, this.#baseShape.bounded, this);
    } else if (this.#baseShape instanceof RotRect) {
      let rotX = this.#cosa * (this.#baseShape.xc - xc) - this.#sina * (this.#baseShape.yc - yc) + xc + this.x;
      let rotY = this.#sina * (this.#baseShape.xc - xc) + this.#cosa * (this.#baseShape.yc - yc) + yc + this.y;
      
      this.shape = new RotRect(rotX, rotY, this.#baseShape.w, this.#baseShape.h, a + this.#baseShape.a, this);
    } else if (this.#baseShape instanceof Poly) {
      let ptsX = [];
      let ptsY = [];
      
      for (let i in this.#baseShape.ptsX) {
        ptsX.push(this.#cosa * (this.#baseShape.ptsX[i] - this.xc) - this.#sina * (this.#baseShape.ptsY[i] - this.yc) + this.xc + this.x)
        ptsY.push(this.#sina * (this.#baseShape.ptsX[i] - this.xc) + this.#cosa * (this.#baseShape.ptsY[i] - this.yc) + this.yc + this.y);
      }
      
      this.shape = new Poly(ptsX, ptsY, this);
    } else if (this.#baseShape instanceof Circle) {
      // rotating a circle around anything but its center is stupid so is turned off, use linear velocity for that.
      // rotating a circle around its center is also useless in every respect but in having a rotational velocity.
      this.xc = 0;
      this.yc = 0;
      this.shape = new Circle(this.#baseShape.x, this.#baseShape.y, this.#baseShape.r, this);
    }
  }
  
  rotate(a) {
    this.a = a;
    
    this.#sina = Math.sin(a);
    this.#cosa = Math.cos(a);
    
    if (this.#baseShape instanceof Rect) {
      let rotX =   this.#cosa * (this.#baseShape.x + this.#baseShape.w / 2 - this.xc)
                 - this.#sina * (this.#baseShape.y + this.#baseShape.h / 2 - this.yc) + this.xc + this.x;
      let rotY =   this.#sina * (this.#baseShape.x + this.#baseShape.w / 2 - this.xc)
                 + this.#cosa * (this.#baseShape.y + this.#baseShape.h / 2 - this.yc) + this.yc + this.y;
      
      this.shape.moveto(rotX, rotY);
      this.shape.rotate(a);
    } else if (this.#baseShape instanceof Tri) {
      let rotX1 = this.#cosa * (this.#baseShape.x1 - this.xc) - this.#sina * (this.#baseShape.y1 - this.yc) + this.xc + this.x;
      let rotY1 = this.#sina * (this.#baseShape.x1 - this.xc) + this.#cosa * (this.#baseShape.y1 - this.yc) + this.yc + this.y;
      let rotX2 = this.#cosa * (this.#baseShape.x2 - this.xc) - this.#sina * (this.#baseShape.y2 - this.yc) + this.xc + this.x;
      let rotY2 = this.#sina * (this.#baseShape.x2 - this.xc) + this.#cosa * (this.#baseShape.y2 - this.yc) + this.yc + this.y;
      let rotX3 = this.#cosa * (this.#baseShape.x3 - this.xc) - this.#sina * (this.#baseShape.y3 - this.yc) + this.xc + this.x;
      let rotY3 = this.#sina * (this.#baseShape.x3 - this.xc) + this.#cosa * (this.#baseShape.y3 - this.yc) + this.yc + this.y;
      
      this.shape.set_pts(true, true, true, rotX1, rotY1, rotX2, rotY2, rotX3, rotY3, true);
    } else if (this.#baseShape instanceof Line) {
      let rotX1 = this.#cosa * (this.#baseShape.x1 - this.xc) - this.#sina * (this.#baseShape.y1 - this.yc) + this.xc + this.x;
      let rotY1 = this.#sina * (this.#baseShape.x1 - this.xc) + this.#cosa * (this.#baseShape.y1 - this.yc) + this.yc + this.y;
      let rotX2 = this.#cosa * (this.#baseShape.x2 - this.xc) - this.#sina * (this.#baseShape.y2 - this.yc) + this.xc + this.x;
      let rotY2 = this.#sina * (this.#baseShape.x2 - this.xc) + this.#cosa * (this.#baseShape.y2 - this.yc) + this.yc + this.y;
      
      this.shape.set_pts(true, true, rotX1, rotY1, rotX2, rotY2, true);
    } else if (this.#baseShape instanceof RotRect) {
      
      let rotX = this.#cosa * (this.#baseShape.xc - this.xc) - this.#sina * (this.#baseShape.yc - this.yc) + this.xc + this.x;
      let rotY = this.#sina * (this.#baseShape.xc - this.xc) + this.#cosa * (this.#baseShape.yc - this.yc) + this.yc + this.y;
      
      this.shape.moveto(rotX, rotY)
      this.shape.rotate(this.#baseShape.a + a)
    } else if (this.#baseShape instanceof Poly) {
      for (let i in this.#baseShape.ptsX) {
        this.shape.ptsX[i] = this.#cosa * (this.#baseShape.ptsX[i] - this.xc) - this.#sina * (this.#baseShape.ptsY[i] - this.yc) + this.xc + this.x;
        this.shape.ptsY[i] = this.#sina * (this.#baseShape.ptsX[i] - this.xc) + this.#cosa * (this.#baseShape.ptsY[i] - this.yc) + this.yc + this.y;
      }
        
      this.shape.recalc_norms();
    } else if (this.#baseShape instanceof Circle) {
      this.shape.moveto(this.#baseShape.x + this.x, this.#baseShape.y + this.y);
    }
  }
  
  moveto(x, y, a) {
    this.x = x;
    this.y = y;
    
    if (a == undefined) {
      a = this.a;
    }
    
    if (this.rotates) {
      this.rotate(a);
    } else {
      if (this.shape instanceof Rect) {
        this.shape.moveto(this.#baseShape.x + x, this.#baseShape.y + y);
      } else if (this.shape instanceof Tri) {
        this.shape.set_pts(true, true, true, this.#baseShape.x1 + x, this.#baseShape.y1 + y, this.#baseShape.x2 + x,
                           this.#baseShape.y2 + y, this.#baseShape.x3 + x, this.#baseShape.y3 + y, false);
      } else if (this.shape instanceof Line) {
        this.shape.set_pts(true, true, this.#baseShape.x1 + x, this.#baseShape.y1 + y, this.#baseShape.x2 + x,
                           this.#baseShape.y2 + y, false);
      } else if (this.shape instanceof RotRect) {
        this.shape.moveto(this.#baseShape.xc + x, this.#baseShape.yc + y);
      } else if (this.#baseShape instanceof Poly) {
        for (let i in this.shape.ptsX) {
          this.shape.ptsX[i] = this.#baseShape.ptsX[i] + x;
          this.shape.ptsY[i] = this.#baseShape.ptsY[i] + y;
        }
      } else if (this.#baseShape instanceof Circle) {
        this.shape.moveto(this.#baseShape.x + x, this.#baseShape.y + y);
      }
    }
  }
  
  intersect_path_with(obj, vx, vy) {
    let pts = [];
    let newpts;
    let sourcePts;
    
    if (this.shape instanceof Circle) {
      if (obj.shape instanceof Circle) {
        let [pt, sourcePt, norm] = moving_circle_intersect(this.shape.x, this.shape.y, this.shape.r, this.vx, this.vy,
                                                           obj.shape.x, obj.shape.y, obj.shape.r, obj.vx, obj.vy, true);
                                         
        if (pt == undefined) {
          return pts;
        } else {
          pt.norm = norm;
          pt.sourcePt = sourcePt;
          pt.parent    = obj;
          pt.generator = this;
          pt.distsq = lensq(pt.x, pt.y, pt.sourcePt.x, pt.sourcePt.y);
          return [pt];
        }
      } else {
        sourcePts = this.shape.get_pts(obj.shape.get_all_norms());
      }
    } else {
      sourcePts = this.shape.get_pts();
    }
    
    // generator: the object that casts the intersecting rays.
    // just look at collision to see why we need this.
    
    for (let sourcePt of sourcePts) {
      newpts = obj.shape.intersect_line(sourcePt.x, sourcePt.y, sourcePt.x+vx, sourcePt.y+vy, true);
      
      for (let pt of newpts) {
        pt.sourcePt = {"x": sourcePt.x, "y": sourcePt.y};
        pt.generator = this;
        pt.distsq = lensq(pt.x, pt.y, pt.sourcePt.x, pt.sourcePt.y);
      }
      
      pts.push(...newpts);
    }
    
    return pts;
  }
  
  // pass only an array/set containing arrays/sets or hitboxes... or else...
  get_path_intersections(objs) {
    let pts = [];
    
    for (let obj of objs) {
      if (obj instanceof Set || obj instanceof Array) {
        pts.push(...this.get_path_intersections(obj));
      } else if (obj instanceof Hitbox) {
        if (this.ignoredGround.includes(obj) || this.encounteredGround.includes(obj)) continue;
        
        if (obj.moves && (obj.vx != 0 || obj.vy != 0)) {
          let vx = this.vx - obj.vx;
          let vy = this.vy - obj.vy;
          
          pts.push(...this.intersect_path_with(obj, vx, vy));
          
          // circle-circle intersection need only be found once
          if (!(this.shape instanceof Circle && obj.shape instanceof Circle)) {
            let temp = obj.intersect_path_with(this, -vx, -vy);
            
            for (let pt of temp) {
              pt.norm.x = -pt.norm.x;
              pt.norm.y = -pt.norm.y;
            }
            
            pts.push(...temp);
          }
        } else {
          pts.push(...this.intersect_path_with(obj, this.vx, this.vy));
          
          if (!(this.shape instanceof Circle && obj.shape instanceof Circle)) {
            let temp = obj.intersect_path_with(this, -this.vx, -this.vy);
            
            for (let pt of temp) {
              pt.norm.x = -pt.norm.x;
              pt.norm.y = -pt.norm.y;
            }
            
            pts.push(...temp);
          }
        }
      } else {
        console.log("An intersection with a non-hitbox was just attempted... you should start thinking about that");
      }
    }
    
    return pts;
  }
  
  check_ignores(objs, arr) {
    for (let obj of objs) {
      if (obj instanceof Set || obj instanceof Array) {
        pts.push(...this.check_ignores(obj));
      } else if (obj instanceof Hitbox) {
        if (obj.ignoreFunc != undefined && obj.ignoreFunc(obj, this)) this.ignoredGround.push(obj);
      }
    }
  }
  
  motion_sweep(objs) {
    this.encounteredGround = [];
    this.ignoredGround     = [];
    this.check_ignores(objs);
    
    this.onGround       = false;
    this.minGravDotNorm = 0;
    
    let stepEncountered    = [];
    let prevNorms          = [];
    
    
    // extremely small velocities mess up the line intersection math
    this.vx = (Math.abs(this.vx) < fuzz) ? 0 : this.vx;
    this.vy = (Math.abs(this.vy) < fuzz) ? 0 : this.vy;
    
    let finalVx = this.vx;
    let finalVy = this.vy;
    let remainderVx = 0;
    let remainderVy = 0;
    let prevVx = 0;
    let prevVy = 0;
    let newStep = true;
    let other = undefined;
    
    let colliding = true;
    let iter = 0;
    let pts = this.get_path_intersections(objs);
    let lastPts;
    let lastPt = undefined;
    let lastDistsq;
    
    this.movedX = 0;
    this.movedY = 0;
    
    while (colliding && iter < 64) {
      let minDistsq = Infinity;
      let minDistPt = undefined;
      
      colliding = false;
      iter++; // failsafe so we don't freeze
      
      for (let pt of pts) {
        let other = pt.parent;
      
        if (pt.parent == this) {
          other = pt.generator;
        }
        
        if (stepEncountered.includes(other)) {
          continue;
        }
        
        if (pt.ignoreOtherVel) {
          pt.dot = dot(pt.norm.x, pt.norm.y, this.vx, this.vy);
        } else {
          pt.dot = dot(pt.norm.x, pt.norm.y, this.vx - other.vx, this.vy - other.vy);
        }
        
        if (pt.distsq <= minDistsq && pt.dot < 0) {
          minDistsq = pt.distsq;
          minDistPt = pt;
          colliding = true;
        } 
      }
      
      if (minDistPt == undefined) {
        if (!newStep) {
          this.moveto(this.x + this.vx, this.y + this.vy);
          this.movedX += this.vx;
          this.movedY += this.vy;
        
          this.vx = remainderVx;
          this.vy = remainderVy;
          remainderVx = 0;
          remainderVy = 0;
          
          let othervx = other.vx;
          let othervy = other.vy;
          
          let startFinalVx = finalVx;
          let startFinalVy = finalVy;
          
          finalVx = finalVx - othervx;
          finalVy = finalVy - othervy;
          
          // (other set in last iteration)
          let rotContactPt;
          
          if (other.rotates) {
            let maxCenterDistsq = 0;
            
            for (let pt of lastPts) {
              let ptOther = pt.parent;
      
              if (pt.parent == this) {
                ptOther = pt.generator;
              }
              
              if (ptOther == other && pt.dot < 0 && pt.distsq <= lastDistsq + fuzzier) {
                let centerDistsq = lensq(other.xc + other.x, other.yc + other.y, pt.x, pt.y);
                
                if (centerDistsq > maxCenterDistsq) {
                  maxCenterDistsq = centerDistsq;
                  rotContactPt = pt;
                }
              }
            }  
                 
            othervx += (other.yc + other.y - rotContactPt.y) * other.va;
            othervy += (rotContactPt.x - other.xc - other.x) * other.va;
          }
          
          // surfaceV ought to be defined for "conveyor belt surface" type objects
          if (other.surfaceV != undefined) {
            othervx -= lastPt.norm.y * other.surfaceV; 
            othervy += lastPt.norm.x * other.surfaceV;
          }
          
          if (this.surfaceV != undefined) {
            othervx -= lastPt.norm.y * this.surfaceV; 
            othervy += lastPt.norm.x * this.surfaceV;
          }
      
          let [projx, projy] = projnorm(finalVx, finalVy, lastPt.norm.x, lastPt.norm.y);
          finalVx = (finalVx - projx) * this.frict * other.frict;
          finalVx -= (this.elast + other.elast) * projx / 2;
          finalVy = (finalVy - projy) * this.frict * other.frict;
          finalVy -= (this.elast + other.elast) * projy / 2;
           
          finalVx += othervx;
          finalVy += othervy;
          
          let gravDotNorm;
          
          if (this.gravity == undefined) {
            gravDotNorm = dot(lastPt.norm.x, lastPt.norm.y, gravity.x, gravity.y);
          } else {
            gravDotNorm = dot(lastPt.norm.x, lastPt.norm.y, this.gravity.x, this.gravity.y);
          }
          
          if (gravDotNorm < this.minGravDotNorm) {
            this.minGravDotNorm = gravDotNorm;
            this.groundNorm     = lastPt.norm;
            this.groundObj      = other;
            this.groundPt       = (rotContactPt == undefined) ? lastPt : rotContactPt;
            this.groundVel      = {"x": othervx, "y": othervy};
            this.onGround       = true;
          }
        
          if (other.collideFunc != undefined) {
            other.collideFunc(other, this, lastPt.norm, finalVx - startFinalVx, finalVy - startFinalVy, rotContactPt);
          }
          
          pts = this.get_path_intersections(objs);
        
          newStep = true;
          stepEncountered = [];

          if (!this.encounteredGround.includes(other)) {
            this.encounteredGround.push(other);
          }
        
          colliding = true;
        }
        
        continue;
      }
      
      lastPt = minDistPt;
      lastPts = pts;
      lastDistsq = minDistsq;
      
      other = minDistPt.parent;
      
      if (other == this) {
        other = minDistPt.generator;
      }
      
      if (!stepEncountered.includes(other)) {
        stepEncountered.push(other);
      }
      
      let pushX = minDistPt.norm.x * fuzz;
      let pushY = minDistPt.norm.y * fuzz;
      
      let stepVx;
      let stepVy;
      
      if (newStep) {
        prevVx = this.vx;
        prevVy = this.vy;
      }
      
      newStep = false;
      
      if (minDistPt.parent == this) {
        stepVx = (minDistPt.sourcePt.x - minDistPt.x);
        stepVy = (minDistPt.sourcePt.y - minDistPt.y);
      } else {
        stepVx = (minDistPt.x - minDistPt.sourcePt.x);
        stepVy = (minDistPt.y - minDistPt.sourcePt.y);
      }
      
      prevNorms.push(minDistPt.norm);
      minDistPt.norm.parent = other;
      
      let opposedNorms = false;
      let opposedNorm;
      
      for (let norm of prevNorms) {
        let theDot = dot(minDistPt.norm.x, minDistPt.norm.y, norm.x, norm.y)
        
        if (theDot < 0 && theDot > -0.99) {
          opposedNorms = true;
          opposedNorm = norm;
          break;
        }
      }
      
      let [projx, projy] = projnorm(other.vx, other.vy, minDistPt.norm.x, minDistPt.norm.y);
      
      stepVx += projx;
      stepVy += projy;
      
      remainderVx = prevVx - stepVx;
      remainderVy = prevVy - stepVy;
      
      stepVx += pushX;
      stepVy += pushY;
      
      this.vx = Math.abs(stepVx) < fuzzier ? 0 : stepVx;
      this.vy = Math.abs(stepVy) < fuzzier ? 0 : stepVy;
      
      if (opposedNorms) {
        remainderVx = 0;
        remainderVy = 0;
      } else {
        [projx, projy] = projnorm(remainderVx, remainderVy, minDistPt.norm.x, minDistPt.norm.y);
        remainderVx = remainderVx - projx;
        remainderVy = remainderVy - projy;
      }
      
      pts = this.get_path_intersections(objs);
    }
    
    this.movedX += this.vx;
    this.movedY += this.vy;
    
    this.moveto(this.x + this.vx, this.y + this.vy);
    this.vx = finalVx;
    this.vy = finalVy;
  }
  
  get_proj_profile(norm, othervx, othervy) {
    let [minpt, maxpt] = this.shape.get_proj_profile(norm, this.vx, this.vy);
    
    let vx = this.movedX - othervx;
    let vy = this.movedY - othervy;
    
    let v = dot(vx, vy, norm.x, norm.y);
    
    return [minpt, maxpt, v];
  }
  
  get_overlaps(objs, crushLogic) {
    let results = [];
    
    for (let obj of objs) {
      if (obj instanceof Set || obj instanceof Array) {
        pts.push(...this.get_overlaps(obj, crushLogic));
      } else if (obj instanceof Hitbox) {
        if (this.ignoredGround.includes(obj) || this.encounteredGround.includes(obj)
            || this.encounteredSprites.includes(obj)) continue;
        
        let norms;
        
        if (obj.shape instanceof Circle) {
          if (this.shape instanceof Circle) {
            let [tempX, tempY] = normalize(this.shape.x - obj.shape.x, this.shape.y - obj.shape.y);
            norms = [{"x": tempX, "y": tempY}];
          } else {
            norms = obj.shape.get_norms(this.shape.get_pts());
            norms.push(...this.shape.get_norms());
          }
        } else {
          norms = obj.shape.get_norms();
          
          if (this.shape instanceof Circle) {
            norms.push(...this.shape.get_norms(obj.shape.get_pts()));
            console.log("fie",norms);
          } else if (!(this.shape instanceof Rect && obj.shape instanceof Rect)) {
            norms.push(...this.shape.get_norms());
          }
        }
        
        let result = {"obj": obj, "crush": true};
        
        // minimum component of translation distance in direction of velocity vector
        let minCompDist = Infinity;
        let minNorm;
        let minOverlap = 0;
        let overlapping = true;
        let savedMymax, savedMymin;
                
        for (let norm of norms) {
          let [mymin, mymax, v] = this.get_proj_profile(norm, obj.movedX, obj.movedY);
          let [objmin, objmax] = obj.get_proj_profile(norm);
          
          let overlap = 0;
          
          // crush only if every norm results in crush, of course
          // no overlap if we break
          // go with min overlap otherwise
          if ((mymax < objmin) || (mymin > objmax)) {
            // ttoo || oott
            
            result.crush = false;
            overlapping = false;
            break; // no overlap
          } else if (mymin >= objmin) {
            // mymax >= objmin
            // mymin <= objmax
            
            if (mymax <= objmax) {
              // object fully contains this hitbox (crush)
              // otto
              
              overlap = crushLogic ? Infinity : mymax - mymin;
            } else {
              // otot
              
              result.crush = false;
              overlap = objmax - mymin;
            }
          } else { // objmin > mymin
            result.crush = false;
            
            if (objmax <= mymax) {
              // this hitbox fully contains object
              // toot
              
              if (v > 0) {
                overlap = objmin - mymax;
              } else {
                overlap = objmax - mymin;
              } if (objmin - mymin > mymax - objmax) {
                overlap = objmin - mymax;
              } else {
                overlap = objmax - mymin;
              }
            } else {
              // toto
              
              overlap = objmin - mymax;
            }
          }
          
          let compDist = Math.abs(overlap);
          
          if (compDist < minCompDist) {
            minCompDist = compDist;
            minNorm = norm;
            minOverlap = overlap;
            savedMymax = mymax;
            savedMymin = mymin;
          }
          
        }
        
        if (overlapping) {
          result.norm = minNorm;
          result.overlap = minOverlap;
          result.compDist = minCompDist;
          result.width = savedMymax - savedMymin;
          
          results.push(result);
        }
      } else {
        console.log("An intersection with a non-hitbox was just attempted... you should start thinking about that");
      }
    }
    
    return results;
  }
  
  motion_ground() {
    if (this.moves) {
      this.movedX = this.vx;
      this.movedY = this.vy;
      
      if (this.rotates) {
        this.moveto(this.x + this.vx, this.y + this.vy, this.a + this.va);
      } else {
        this.moveto(this.x + this.vx, this.y + this.vy);
      }
    } else if (this.rotates) {
      this.rotate(this.a + this.va)
    }
    
  }
  
  motion_correct(objs) {
    let finalVx = this.vx;
    let finalVy = this.vy;
    
    let encounteredSweep = this.encounteredGround;
    this.encounteredGround = [];
    let prevNorms = [];
    
    let overlaps = this.get_overlaps(objs, true);
    let iter = 0;
    
    while (overlaps.length > 0 && iter < 64) {
      let maxCompDist = -Infinity;
      let maxResult = undefined;
      
      for (let result of overlaps) {
        if (result.crush) {
          this.encounteredGround.push(result.obj);
          continue;
        }
        
        if (result.compDist >= maxCompDist) {
          maxResult = result;
        }
      }
      
      if (maxResult == undefined) break;
      
      this.encounteredGround.push(maxResult.obj);
      
      if (maxResult.crush) continue; // maybe we'll fix it... somehow...
       
      let other = maxResult.obj;
      let norm = maxResult.norm;
      
      let transX = (maxResult.overlap + fuzz * Math.sign(maxResult.overlap)) * norm.x;
      let transY = (maxResult.overlap + fuzz * Math.sign(maxResult.overlap)) * norm.y;
      
      norm.x *= Math.sign(maxResult.overlap);
      norm.y *= Math.sign(maxResult.overlap);
      
      let opposedNorms = false;
      let opposedNorm;
      
      for (let prevNorm of prevNorms) {
        let theDot = dot(prevNorm.x, prevNorm.y, norm.x, norm.y)
        if (theDot < 0 && theDot > -0.99) {
          opposedNorms = true;
          opposedNorm = prevNorm;
          break;
        }
      }
      
      prevNorms.push(norm);
      
      if (opposedNorms) {
        [transX, transY] = reverse_proj(transX, transY, opposedNorm.y, -opposedNorm.x);
        this.moveto(this.x + transX, this.y + transY);
      } else {
        this.moveto(this.x + transX, this.y + transY);
      }
      
      this.movedX += transX;
      this.movedY += transY;
      
      if (!encounteredSweep.includes(other)) {
        let othervx = other.vx;
        let othervy = other.vy;
        
        let rotContactPt;
        
        if (other.rotates) {
          let pts = this.intersect_path_with(other, -transX, -transY);
          pts.push(...other.intersect_path_with(this, transX, transY));
          
          let minDistSq = Infinity;
          let maxCenterDistsq = 0;
          
          for (let pt of pts) {
            if (pt.distsq <= minDistSq) {
              minDistSq = pt.distsq;
            }
          }  
              
          for (let pt of pts) {
            if (pt.distsq <= minDistSq + fuzzier) {
              let centerDistsq = lensq(other.xc + other.x, other.yc + other.y, pt.x, pt.y);
              
              if (centerDistsq > maxCenterDistsq) {
                maxCenterDistsq = centerDistsq;
                rotContactPt = pt;
              }
            }
          }
          
          if (rotContactPt != undefined) {
            othervx += (other.yc + other.y - rotContactPt.y) * other.va;
            othervy += (rotContactPt.x - other.xc - other.x) * other.va;
          }
        }
        
        // surfaceV ought to be defined for "conveyor belt surface" type objects
        if (other.surfaceV != undefined) {
          othervx -= norm.y * other.surfaceV; 
          othervy += norm.x * other.surfaceV;
        }
        
        if (this.surfaceV != undefined) {
          othervx -= norm.y * this.surfaceV; 
          othervy += norm.x * this.surfaceV;
        }
        
        let startVx = this.vx;
        let startVy = this.vy;
        
        this.vx -= othervx;
        this.vy -= othervy;
        
        let [projx, projy] = projnorm(this.vx, this.vy, norm.x, norm.y);
        this.vx = (finalVx - projx) * this.frict * other.frict;
        this.vx -= (this.elast + other.elast) * projx / 2;
        this.vy = (finalVy - projy) * this.frict * other.frict;
        this.vy -= (this.elast + other.elast) * projy / 2;
         
        this.vx += othervx;
        this.vy += othervy;
        
        if (other.collideFunc != undefined) {
          other.collideFunc(other, this, norm, this.vx - startVx, this.vy - startVy, rotContactPt);
        }
        
        let gravDotNorm;
        
        if (this.gravity == undefined) {
          gravDotNorm = dot(norm.x, norm.y, gravity.x, gravity.y);
        } else {
          gravDotNorm = dot(norm.x, norm.y, this.gravity.x, this.gravity.y);
        }
        
        if (gravDotNorm < this.minGravDotNorm) {
          this.minGravDotNorm = gravDotNorm;
          this.groundNorm     = norm;
          this.groundObj      = other;
          this.groundPt       = rotContactPt;
          this.groundVel      = {"x": othervx, "y": othervy};
          this.onGround       = true;
        }
      }
      
      overlaps = this.get_overlaps(objs, true);
      iter++;
    }
    
    this.encounteredGround = [];
    
    overlaps = this.get_overlaps(objs, true);
    if (overlaps.length > 0) this.events.push("crush");
  }
  
  sprite_collide(sprites) {
    this.encounteredSprites = [];
    
    let results = this.get_overlaps(sprites, false);
    
    for (let result of results) {
      if (result.obj.collideFunc != undefined) {
        result.obj.collideFunc(result.obj, this, result);
      }
    }
    
  }
}
