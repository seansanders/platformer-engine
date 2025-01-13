// sorry for ugly code

const FUZZ     = 1/64;
const FUZZIER  = 1/256;
const FUZZIEST = 1/8192;
const COLLISION_IGNORE_SAFETY = 1.3;

const PI  = Math.PI;
const TAU = 2 * PI;

let gravity = {"x": 0, "y": 0.5};
let air     = {"drag": 0.99, "vx": 0, "vy": 0, "swim": false};

let keysPressed = {"escape": false,"f1": false,"f2": false,"f3": false,"f4": false,"f5": false,"f6": false,"f7": false,"f8": false,"f9": false,"f10": false,"f11": false,"f12": false,"delete": false,"`": false,"1": false,"2": false,"3": false,"4": false,"5": false,"6": false,"7": false,"8": false,"9": false,"0": false,"-": false,"=": false,"backspace": false,"home": false,"~": false,"!": false,"@": false,"#": false,"$": false,"%": false,"^": false,"&": false,"*": false,"(": false,")": false,"_": false,"+": false,"tab": false,"q": false,"w": false,"e": false,"r": false,"t": false,"y": false,"u": false,"i": false,"o": false,"p": false,"[": false,"]": false,"\\": false,"pageup": false,"{": false,"}": false,"|": false,"capslock": false,"a": false,"s": false,"d": false,"f": false,"g": false,"h": false,"j": false,"k": false,"l": false,";": false,"'": false,"enter": false,"pagedown": false,":": false,"\"": false,"shift": false,"z": false,"x": false,"c": false,"v": false,"b": false,"n": false,"m": false,",": false,".": false,"/": false,"end": false,"<": false,">": false,"?": false,"control": false,"alt": false," ": false,"arrowup": false,"arrowleft": false,"arrowdown": false,"arrowright": false}; // only keys on my laptop keyboard, you might want to extend this

const SHIFTED_KEYS = {"`": "~","1": "!","2": "@","3": "#","4": "$","5": "%","6": "^","7": "&","8": "*","9": "(","0": ")","-": "_","=": "+","[": "{","]": "}","\\": "|",";": ":","'": "\"",",": "<",".": ">","": "?"};

const DOM    = 0;

const LINEAR = 0;
const SMOOTH = 1;

let DEFAULT_COLOR      = "#FFFFFF";
let DEFAULT_LINE_WIDTH = 1;
let DEFAULT_FILL       = undefined;

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

// for cases where an arbitrary normal is more harmful than
// a 0 vector
function normalize_default(x, y) {
  let l = mag(x, y);
  return l == 0 ? [0, 1] : [x/l, y/l];
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

function sum_mags(...args) {
  let sum = 0;
  
  for (let num of args) {
    sum += Math.abs(num);
  }
  
  return sum;
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

class Shape {
  constructor(parent) {
    this.parent = parent; // the hitbox object that owns/created this shape.
  }
  
  copy() {}
  
  get_pts() {}
  
  // when sign of direction is unimportant (rects, for example, only need 2)
  get_norms() {}
  
  // when all directions are needed, including direct opposites (rects have 4)
  get_all_norms() {}
  
  get_proj_profile() {}
  
  // changeShape: true if the baseShape of the hitbox is not expected to be
  // (geometrically) similar to this shape in its current form. if false,
  // allows a little work to be saved, and/or does not change shape to be
  // similar to baseShape.
  update_to_hitbox(hitbox, changeShape) {}
}

class Line extends Shape {
  #nx;
  #ny;
  #nxp;
  #nyp;
  
  constructor (x1, y1, x2, y2, bounded, parent) {
    super(parent);
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.bounded = bounded;
    
    this.#set_normals(); 
    
    this.distCx = (this.x1 + this.x2) / 2;
    this.distCy = (this.y1 + this.y2) / 2;
    this.distR = sum_mags(this.x1 - this.x2, this.y1 - this.y2);
  }
  
  
  copy() {
    return new Line(this.x1, this.y1, this.x2, this.y2, this.bounded, this.parent);
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
    
    this.distCx = (this.x1 + this.x2) / 2;
    this.distCy = (this.y1 + this.y2) / 2;
    this.distR = sum_mags(this.x1 - this.x2, this.y1 - this.y2);
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
    let dot1 = dot(this.x1, this.y1, norm.x, norm.y);
    let dot2 = dot(this.x2, this.y2, norm.x, norm.y);

    return (dot1 > dot2) ? [dot2, dot1] : [dot1, dot2];
  }
  
  update_to_hitbox(hitbox, changeShape) {
    let base = hitbox.baseShape;
    
    if (base instanceof Line) {
      if (hitbox.rotates) {
        let rotX1 = hitbox.cosa * (base.x1 - hitbox.xc) - hitbox.sina * (base.y1 - hitbox.yc) + hitbox.xc + hitbox.x;
        let rotY1 = hitbox.sina * (base.x1 - hitbox.xc) + hitbox.cosa * (base.y1 - hitbox.yc) + hitbox.yc + hitbox.y;
        let rotX2 = hitbox.cosa * (base.x2 - hitbox.xc) - hitbox.sina * (base.y2 - hitbox.yc) + hitbox.xc + hitbox.x;
        let rotY2 = hitbox.sina * (base.x2 - hitbox.xc) + hitbox.cosa * (base.y2 - hitbox.yc) + hitbox.yc + hitbox.y;
      
        this.set_pts(true, true, rotX1, rotY1, rotX2, rotY2, true);
      } else {
        this.set_pts(true, true, base.x1 + hitbox.x, base.y1 + hitbox.y,
                     base.x2 + hitbox.x, base.y2 + hitbox.y, changeShape);
      }
      
      if (changeShape) this.bounded = base.bounded;
    } // else... do nothing because this must have been called by mistake
  }
}

class Tri extends Shape {
  #flippedNormals;
  
  #nx1;
  #ny1;
  #nx2;
  #ny2;
  #nx3;
  #ny3;
  
  constructor(x1, y1, x2, y2, x3, y3, parent) {
    super(parent);
    
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
    
    this.#update_dist_calc_vars();
  }
  
  copy() {
    return new Tri(this.x1, this.y1, this.x2, this.y2, this.x3, this.y3, parent);
  }
  
  set_pts(set1, set2, set3, x1, y1, x2, y2, x3, y3, calcNorms, calcDistVars) {
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
    
    if (calcDistVars) this.#update_dist_calc_vars();
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
  
  #update_dist_calc_vars() {
    let minX = Math.min(this.x1, this.x2, this.x3);
    let maxX = Math.max(this.x1, this.x2, this.x3);
    let minY = Math.min(this.y1, this.y2, this.y3);
    let maxY = Math.max(this.y1, this.y2, this.y3);
    
    this.distCx = (minX + maxX) / 2;
    this.distCy = (minY + maxY) / 2;
    this.distR  = maxX - minX + maxY - minY;
  }
  
  update_to_hitbox(hitbox, changeShape) {
    let base = hitbox.baseShape;
    
    if (base instanceof Tri) {
      if (hitbox.rotates) {
        let rotX1 = hitbox.cosa * (base.x1 - hitbox.xc) - hitbox.sina * (base.y1 - hitbox.yc) + hitbox.xc + hitbox.x;
        let rotY1 = hitbox.sina * (base.x1 - hitbox.xc) + hitbox.cosa * (base.y1 - hitbox.yc) + hitbox.yc + hitbox.y;
        let rotX2 = hitbox.cosa * (base.x2 - hitbox.xc) - hitbox.sina * (base.y2 - hitbox.yc) + hitbox.xc + hitbox.x;
        let rotY2 = hitbox.sina * (base.x2 - hitbox.xc) + hitbox.cosa * (base.y2 - hitbox.yc) + hitbox.yc + hitbox.y;
        let rotX3 = hitbox.cosa * (base.x3 - hitbox.xc) - hitbox.sina * (base.y3 - hitbox.yc) + hitbox.xc + hitbox.x;
        let rotY3 = hitbox.sina * (base.x3 - hitbox.xc) + hitbox.cosa * (base.y3 - hitbox.yc) + hitbox.yc + hitbox.y;
        
        this.set_pts(true, true, true, rotX1, rotY1, rotX2, rotY2, rotX3, rotY3, true, false);
      } else {
        this.set_pts(true, true, true, base.x1 + hitbox.x, base.y1 + hitbox.y, base.x2 + hitbox.x,
                     base.y2 + hitbox.y, base.x3 + hitbox.x, base.y3 + hitbox.y, changeShape, false);
      }
      
      this.distCx = base.distCx + hitbox.x;
      this.distCy = base.distCy + hitbox.y;
      this.distR  = base.distR;
    }
  } // else... do nothing because this must have been called by mistake
}

class Rect extends Shape {
  constructor(x, y, w, h, parent) {
    super(parent);
    
    // x and y are coords of the top left corner
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    
    this.#update_dist_calc_vars();
  }
  
  copy() {
    return new Rect(this.x, this.y, this.w, this.h);
  }
  
  reset(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    
    this.#update_dist_calc_vars();
  }
  
  resize(w, h) {
    this.w = w;
    this.h = h;
    
    this.distR = this.w + this.h;
  }
  
  moveto(x, y) {
    this.x = x;
    this.y = y;
    
    this.distCx = this.x + this.w / 2;
    this.distCy = this.y + this.h / 2;
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
    let minpt;
    let maxpt;
    
    let xw = this.x + this.w;
    let yh = this.y + this.h;
    
    temp = dot(this.x, this.y, norm.x, norm.y);
    minpt = temp;
    maxpt = temp;
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
  
  #update_dist_calc_vars() {
    this.distCx = this.x + this.w / 2;
    this.distCy = this.y + this.h / 2;
    this.distR = this.w + this.h;
  }
  
  update_to_hitbox(hitbox, changeShape) {
    let base = hitbox.baseShape;
    
    if (base instanceof Rect && !hitbox.rotates) {
      // rotating Rect hitboxes must have rotRect shapes
      if (changeShape) {
        this.reset(base.x + hitbox.x, base.y + hitbox.y, base.w, base.h);
      } else {
        this.moveto(base.x + hitbox.x, base.y + hitbox.y);
      }
    }
  } // else... do nothing because this must have been called by mistake
}

class RotRect extends Shape {
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
    super(parent);
    
    // x and y are center points for this fella rather than TL corner
    this.xc = xc;
    this.yc = yc;
    this.w = w;
    this.h = h;
    this.a = a;
    
    this.#cosa = Math.cos(this.a);
    this.#sina = Math.sin(this.a);
    
    this.#gen_pts();
    this.#gen_norms();
    
    this.distCx = this.xc;
    this.distCy = this.yc;
    this.distR = this.w + this.h;
  }
  
  copy() {
    return new RotRect(this.xc, this.yc, this.w, this.h, this.a, this.parent);
  }
  
  #gen_pts() {
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
  
  #gen_norms() {
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
    
    this.#gen_pts();
    this.#gen_norms();
    
    this.distCx = this.xc;
    this.distCy = this.yc;
    this.distR = this.w + this.h;
  }
  
  rotate(a) {
    this.a = a;
    this.#cosa = Math.cos(this.a);
    this.#sina = Math.sin(this.a);
    
    this.#gen_pts();
    this.#gen_norms();
  }
  
  resize(w, h) {
    this.w = w;
    this.h = h;
    
    this.#gen_pts();
    this.distR = this.w + this.h;
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
    
    this.distCx = this.xc;
    this.distCy = this.yc;
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
    let minpt;
    let maxpt;
    
    temp = dot(this.x1, this.y1, norm.x, norm.y);
    minpt = temp;
    maxpt = temp;
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
  
  update_to_hitbox(hitbox, changeShape) {
    let base = hitbox.baseShape;
    
    if (base instanceof Rect) {
      if (hitbox.rotates) {
        let rotX =   hitbox.cosa * (base.x + base.w / 2 - hitbox.xc)
                   - hitbox.sina * (base.y + base.h / 2 - hitbox.yc) + hitbox.xc + hitbox.x;
        let rotY =   hitbox.sina * (base.x + base.w / 2 - hitbox.xc)
                   + hitbox.cosa * (base.y + base.h / 2 - hitbox.yc) + hitbox.yc + hitbox.y;
        
        if (changeShape) {
          this.reset(rotX, rotY, base.w, base.h, hitbox.a);
        } else {
          this.reset(rotX, rotY, this.w, this.h, hitbox.a);
        }
      } else {
        if (changeShape) {
          this.reset(base.x + base.w / 2 + hitbox.x, base.y + base.h / 2 + hitbox.y, base.w, base.h, 0);
        } else {
          this.reset(base.x + this.w / 2 + hitbox.x, base.y + this.h / 2 + hitbox.y, this.w, this.h, 0);
        }
      }
    } else if (base instanceof RotRect) {
      let base = hitbox.baseShape;
      
      if (hitbox.rotates) {
        let rotX = hitbox.cosa * (base.xc - hitbox.xc) - hitbox.sina * (base.yc - hitbox.yc) + hitbox.xc + hitbox.x;
        let rotY = hitbox.sina * (base.xc - hitbox.xc) + hitbox.cosa * (base.yc - hitbox.yc) + hitbox.yc + hitbox.y;
        
        if (changeShape) {
          this.reset(rotX, rotY, base.w, base.h, base.a + hitbox.a);
        } else {
          this.reset(rotX, rotY, this.w, this.h, base.a + hitbox.a);
        }
      } else {
        if (changeShape) {
          this.reset(base.xc + hitbox.x, base.yc + hitbox.y, base.w, base.h, base.a);
        } else {
          this.reset(base.xc + hitbox.x, base.yc + hitbox.y, this.w, this.h, base.a);
        }
      }
    }
  } // else... do nothing because this must have been called by mistake
}

// it is up to YOU to make sure it is convex and non-intersecting!!
class Poly extends Shape {
  #flippedNormals;
  
  #normalsX;
  #normalsY;
  
  constructor(ptsX, ptsY, parent) {
    super(parent);
    
    if (ptsX.length != ptsY.length || ptsX.length < 3) {
      console.log("illegal polygon point specification");
      return;
    }
    
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
    
    this.#update_dist_calc_vars();
  }
  
  copy() {
    let ptsX = [];
    let ptsY = [];
    
    for (let i = 0; i < len(this.ptsX); i++) {
      ptsX.push(this.ptsX[i]);
      ptsY.push(this.ptsY[i]);
    } 
    
    return new Poly(ptsX, ptsY, this.parent);
  }
  
  // can skip this practically on account of the point arrays can be edited from the outside
  // (which should be faster as new input ptsX and ptsY arrays need not be created
  set_pts(ptsX, ptsY, calcNorms) {
  
    if (ptsX.length != this.ptsX.length || ptsY.length != this.ptsY.length) {
      console.log("illegal polygon point respecification (1)");
      return;
    }
  
    for (let i = 0; i < this.ptsX.length; i++) {
      this.ptsX[i] = ptsX[i];
      this.ptsY[i] = ptsY[i];
    }
    
    if (calcNorms) {
      this.#recalc_norms(setPts)
    }
    
    this.#update_dist_calc_vars();
  }
  
  #recalc_norms() {
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
  
  #update_dist_calc_vars() {
    let minX =  Infinity;
    let maxX = -Infinity;
    let minY =  Infinity;
    let maxY = -Infinity;
    
    for (let i = 0; i < this.ptsX.length; i++) {
      minX = Math.min(this.ptsX[i], minX);
      maxX = Math.max(this.ptsX[i], maxX);
      minY = Math.min(this.ptsY[i], minY);
      maxY = Math.max(this.ptsY[i], maxY);
    }
    
    this.distR  = maxX - minX + maxY - minY;
    this.distCx = (maxX + minX) / 2;
    this.distCy = (maxY + minY) / 2;
  }
  
  update_to_hitbox(hitbox, changeShape) {
    let base = hitbox.baseShape;
    
    if (base instanceof Poly && base.ptsX.length == this.ptsX.length) {
      if (base.ptsX.length != this.ptsX.length || base.ptsY.length != this.ptsY.length) {
        console.log("illegal polygon point respecification (2)");
        return;
      }
      
      if (hitbox.rotates) {
        for (let i in base.ptsX) {
          this.ptsX[i] =   hitbox.cosa * (base.ptsX[i] - hitbox.xc)
                         - hitbox.sina * (base.ptsY[i] - hitbox.yc) + hitbox.xc + hitbox.x;
          this.ptsY[i] =   hitbox.sina * (base.ptsX[i] - hitbox.xc)
                         + hitbox.cosa * (base.ptsY[i] - hitbox.yc) + hitbox.yc + hitbox.y;
        }
         
        this.#recalc_norms();
        
        if (changeShape) {
          this.distR = base.distR;
        }
      } else {
        for (let i in base.ptsX) {
          this.ptsX[i] = base.ptsX[i] + hitbox.x;
          this.ptsY[i] = base.ptsY[i] + hitbox.y;
        }
        
        if (changeShape) {
          this.#recalc_norms();
          this.distR = base.distR;
        }
      }
      
      this.distCx = base.distCx + hitbox.x;
      this.distCy = base.distCy + hitbox.y;
    }
  } // else... do nothing because this must have been called by mistake
}

class Circle extends Shape {
  constructor(x, y, r, parent) {
    super(parent);
    
    this.x = x;
    this.y = y;
    this.r = Math.abs(r);
    this.distR  = this.r * 2;
    this.distCx = this.x;
    this.distCy = this.y;
    this.parent = parent;
  }
  
  copy() {
    return new Circle(this.x, this.y, this.r, this.parent);
  }
  
  moveto(x, y) {
    this.x = x;
    this.y = y;
    this.distCx = this.x;
    this.distCy = this.y;
  }
  
  resize(r) {
    this.r = Math.abs(r);
    this.distR  = this.r * 2;
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
      
      let [normX, normY] = normalize(temp.x - this.x, temp.y - this.y);
      
      temp.norm = {"x": normX, "y": normY};
      pts.push(temp);
    }
    
    return pts;
  }
  
  // get_norms gets the norm in the direction of the nearest point in pts
  // (nearest point and not all points because this is used in SAT collision-
  // a circle intersecting with a polygon will have a minimum translation
  // vector only in the direction of the nearest point to the circle center)
  get_norms(pts) {
    let norms = [];
    
    let pt = this.closest_pt(pts);
    
    if (pt != undefined) {
      let [normX, normY] = normalize_default(pt.x - this.x, pt.y - this.y);
      norms.push({"x": normX, "y": normY});
    }
    
    return norms;
  }
  
  get_all_norms(pts) {
    return this.get_norms(pts);
  }
  
  // get_pts gets points on the circle tangent to lines with the given norms-
  // this is used in motion_sweep because the first point of a moving circle to
  // intersect a polygon will be a point on that circle tangent to some surface
  // of that polygon
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
  
  update_to_hitbox(hitbox, changeShape) {
    let base = hitbox.baseShape;
    
    if (base instanceof Circle) {
      if (changeShape) this.resize(base.r);
      
      if (hitbox.rotates) {
        let x =   hitbox.cosa * (base.x - hitbox.xc)
                - hitbox.sina * (base.y - hitbox.yc) + hitbox.xc + hitbox.x;
        let y =   hitbox.sina * (base.x - hitbox.xc)
                + hitbox.cosa * (base.y - hitbox.yc) + hitbox.yc + hitbox.y;
        this.moveto(x, y);
      } else {
        this.moveto(base.x + hitbox.x, base.y + hitbox.y);
      }
    }
  } // else... do nothing because this must have been called by mistake
}

// "distance" is calculated with an extremely simple metric for (hopefully) efficiency
// (taxicab distance augmented by rotation / movement potential)
function too_distant_to_collide(hitbox1, hitbox2) {
  let dist      = sum_mags(hitbox1.shape.distCx - hitbox2.shape.distCx, 
                           hitbox1.shape.distCy - hitbox2.shape.distCy);
  let checkDist = sum_mags(hitbox1.shape.distR, hitbox2.shape.distR,
                           hitbox1.vx - hitbox2.vx, hitbox1.vy - hitbox2.vy);
  if (hitbox1.rotates) checkDist += sum_mags(hitbox1.xc - hitbox1.baseShape.distCx,
                                             hitbox1.yc - hitbox1.baseShape.distCy);
  if (hitbox2.rotates) checkDist += sum_mags(hitbox2.xc - hitbox2.baseShape.distCy,
                                             hitbox2.yc - hitbox2.baseShape.distCy);
  
  
  // debug
  /*
  if (dist > checkDist * COLLISION_IGNORE_SAFETY) {
    hitbox2.debugDrawColor = "blue";
    hitbox2.shape.debugDrawColor = "blue";
  } else {
    hitbox2.debugDrawColor = "white";
    hitbox2.shape.debugDrawColor = "white";
  }
  */
  
  return dist > checkDist * COLLISION_IGNORE_SAFETY;
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
  
  // basically- check that the caller is above every surface of the encountered shape
  // in the direction of the caller's gravity
  
  if (encountered.shape instanceof Circle) {
    if (caller.shape instanceof Circle) {
      let [tempX, tempY] = normalize_default(caller.shape.x - encountered.shape.x, caller.shape.y - encountered.shape.y);
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

// a ground collideFunc or supportingFunc example
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


// a nonsolid collideFunc example
function fluid_effect(encountered, caller, overlapResult) {
  caller.events.push({"type": "fluid", "obj": encountered.fluid, "overlap": Math.abs(overlapResult.overlap / overlapResult.width)});
}

class Hitbox {
  #x;
  #y;
  #a;
  #cosa;
  #sina;
  
  // if rotates is true, set_rot_params MUST be called after constructor before this hitbox is used
  constructor(shape, parent, moves, rotates, x, y, vx, vy, mass, frict, elast, dragAdjust=1,
              ignoreFunc, collideFunc, supportingFunc) {
    this.parent = parent;
    this.moves = moves;
    this.rotates = rotates;
    
    // baseShape is saved as a reference for whenever the shape moves or rotates
    // (for fear of cumulative translations/rotations eventually dislocating
    // its points relative to each other)
    this.baseShape = shape;
    this.baseShape.parent = this; // not necessary but i feel weird not setitng it
    
    if (!rotates) {
      if (this.baseShape instanceof Rect) {
        this.shape = new Rect(this.baseShape.x + x, this.baseShape.y + y, this.baseShape.w, this.baseShape.h, this);
      } else if (this.baseShape instanceof Tri) {
        this.shape = new Tri(this.baseShape.x1 + x, this.baseShape.y1 + y, this.baseShape.x2 + x,
                             this.baseShape.y2 + y, this.baseShape.x3 + x, this.baseShape.y3 + y, this);
      } else if (this.baseShape instanceof Line) {
        this.shape = new Line(this.baseShape.x1 + x, this.baseShape.y1 + y, this.baseShape.x2 + x,
                              this.baseShape.y2 + y, this.baseShape.bounded, this);
      } else if (this.baseShape instanceof RotRect) {
        this.shape = new RotRect(this.baseShape.xc + x, this.baseShape.yc + y, this.baseShape.w, this.baseShape.h,
                                 this.baseShape.a, this);
      } else if (this.baseShape instanceof Poly) {
        
        let ptsX = this.baseShape.ptsX.slice();
        let ptsY = this.baseShape.ptsY.slice();
        
        for (let i in ptsX) {
          ptsX[i] += x;
          ptsY[i] += y;
        }
        
        this.shape = new Poly(ptsX, ptsY, this);
        
      } else if (this.baseShape instanceof Circle) {
        this.shape = new Circle(this.baseShape.x + x, this.baseShape.y + y, this.baseShape.r, this);
      }
    }
    
    this.#x = x;
    this.#y = y;
    this.vx = vx;
    this.vy = vy;
    
    // tracks how much the hitbox has moved so far in this tick (motion_sweep + motion_correct or motion_ground
    // depending on what this hitbox is for), 
    this.movedX = 0;
    this.movedY = 0;
    
    this.mass = mass;

    this.frict = frict; // between 0 = 1, 0 is most friction, 1 least
    this.elast = elast; // between 0 and 1, 1 is bounciest and 0 least bouncy
    this.dragAdjust = dragAdjust;
    
    this.ignoreFunc     = ignoreFunc;
    this.collideFunc    = collideFunc;
    this.supportingFunc = supportingFunc; // called by objects this hitbox is acting as the ground for
    
    this.ignored           = [];
    this.encounteredGround = [];
    this.encounteredNonsolids = [];
    this.events = [];
    
    this.onGround = false;
    
    // some additional parameters that 
  }
  
  // position and angle must be set through dedicated move/rotate functions
  // or else they become inconsistent with the shape object and possibly other bad things
  get x() {
    return this.#x;
  }
  
  get y() {
    return this.#y;
  }
  
  get a() {
    return this.#a;
  }
  
  get cosa() {
    return this.#cosa;
  }
  
  get sina() {
    return this.#sina;
  }
  
  set_rot_params(xc, yc, a, va) {
    this.rotates = true;
    
    this.xc = xc;
    this.yc = yc;
    this.#a = a;
    this.va = va;
    
    this.#sina = Math.sin(a);
    this.#cosa = Math.cos(a);
    
    if (this.baseShape instanceof Rect) {
      let rotX =   this.#cosa * (this.baseShape.x - this.baseShape.w / 2 - xc)
                 - this.#sina * (this.baseShape.y - this.baseShape.h / 2 - yc) + xc  + this.#x;
      let rotY =   this.#sina * (this.baseShape.x - this.baseShape.w / 2 - xc)
                 + this.#cosa * (this.baseShape.y - this.baseShape.h / 2 - yc) + yc  + this.#x;
      
      this.shape = new RotRect(rotX, rotY, this.baseShape.w, this.baseShape.h, this.#a, this);
    } else if (this.baseShape instanceof Tri) {
      let rotX1 = this.#cosa * (this.baseShape.x1 - xc) - this.#sina * (this.baseShape.y1 - yc) + xc + this.#x;
      let rotY1 = this.#sina * (this.baseShape.x1 - xc) + this.#cosa * (this.baseShape.y1 - yc) + yc + this.#y;
      let rotX2 = this.#cosa * (this.baseShape.x2 - xc) - this.#sina * (this.baseShape.y2 - yc) + xc + this.#x;
      let rotY2 = this.#sina * (this.baseShape.x2 - xc) + this.#cosa * (this.baseShape.y2 - yc) + yc + this.#y;
      let rotX3 = this.#cosa * (this.baseShape.x3 - xc) - this.#sina * (this.baseShape.y3 - yc) + xc + this.#x;
      let rotY3 = this.#sina * (this.baseShape.x3 - xc) + this.#cosa * (this.baseShape.y3 - yc) + yc + this.#y;
      
      this.shape = new Tri(rotX1, rotY1, rotX2, rotY2, rotX3, rotY3, this);
    } else if (this.baseShape instanceof Line) {
      let rotX1 = this.#cosa * (this.baseShape.x1 - xc) - this.#sina * (this.baseShape.y1 - yc) + xc + this.#x;
      let rotY1 = this.#sina * (this.baseShape.x1 - xc) + this.#cosa * (this.baseShape.y1 - yc) + yc + this.#y;
      let rotX2 = this.#cosa * (this.baseShape.x2 - xc) - this.#sina * (this.baseShape.y2 - yc) + xc + this.#x;
      let rotY2 = this.#sina * (this.baseShape.x2 - xc) + this.#cosa * (this.baseShape.y2 - yc) + yc + this.#y;
      
      this.shape = new Line(rotX1, rotY1, rotX2, rotY2, this.baseShape.bounded, this);
    } else if (this.baseShape instanceof RotRect) {
      let rotX = this.#cosa * (this.baseShape.xc - xc) - this.#sina * (this.baseShape.yc - yc) + xc + this.#x;
      let rotY = this.#sina * (this.baseShape.xc - xc) + this.#cosa * (this.baseShape.yc - yc) + yc + this.#y;
      
      this.shape = new RotRect(rotX, rotY, this.baseShape.w, this.baseShape.h, a + this.baseShape.a, this);
    } else if (this.baseShape instanceof Poly) {
      let ptsX = [];
      let ptsY = [];
      
      for (let i in this.baseShape.ptsX) {
        ptsX.push(this.#cosa * (this.baseShape.ptsX[i] - this.xc) - this.#sina * (this.baseShape.ptsY[i] - this.yc) + this.xc + this.#x)
        ptsY.push(this.#sina * (this.baseShape.ptsX[i] - this.xc) + this.#cosa * (this.baseShape.ptsY[i] - this.yc) + this.yc + this.#y);
      }
      
      this.shape = new Poly(ptsX, ptsY, this);
    } else if (this.baseShape instanceof Circle) {
      // rotating a circle around anything but its center is stupid (linear velocity would simulate it fine),
      // but maybe might make the implementation of some things easier for somebody, so go wild.
      let rotX = this.#cosa * (this.baseShape.x - xc) - this.#sina * (this.baseShape.y - yc) + xc + this.#x;
      let rotY = this.#sina * (this.baseShape.x - xc) + this.#cosa * (this.baseShape.y - yc) + yc + this.#y;
      this.shape = new Circle(rotx, roty, this.baseShape.r, this);
    }
  }
  
  rotate(a) {
    this.#a = a;
    
    this.#sina = Math.sin(a);
    this.#cosa = Math.cos(a);
    
    this.shape.update_to_hitbox(this, false);
  }
  
  moveto(x, y, a) {
    this.#x = x;
    this.#y = y;
    
    if (a == undefined) {
      a = this.#a;
    }
    
    if (this.rotates) {
      this.rotate(a);
    } else {
      this.shape.update_to_hitbox(this, false);
    }
  }
  
  moveby(dx, dy, da) {
    if (this.#a == undefined || da == undefined) {
      this.moveto(this.#x + dx, this.#y + dy);
    } else {
      this.moveto(this.#x + dx, this.#y + dy, this.#a + da);
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
    // this needs to be stored, because both the original calling hitbox and the ground
    // hitbox being checked get this function called
    
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
        if (this.ignored.includes(obj) || this.encounteredGround.includes(obj)) continue;
        
        if (obj.moves) {
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
  
  check_ignores(objs) {
    for (let obj of objs) {
      if (obj instanceof Set || obj instanceof Array) {
        this.check_ignores(obj);
      } else if (obj instanceof Hitbox) {
        if ( obj == this || too_distant_to_collide(this, obj) ||
            (obj.ignoreFunc != undefined && obj.ignoreFunc(obj, this)) ) {
          this.ignored.push(obj);
        }
      }
    }
  }
  
  // first stage of ground collision- using above functions, looks at the movement path of this hitbox
  // and stops it from passing through objects it will encounter.
  // has problems with encountering objects with different velocities, and doesn't consider
  // rotating objects' rotations at all. these failures are then handled by the second stage
  // after the ground moves and rotates
  motion_sweep(objs) {
    this.encounteredGround = [];
    this.ignored           = [];
    this.check_ignores(objs);
    
    this.onGround       = false;
    this.minGravDotNorm = 0;
    
    let stepEncountered    = [];
    let prevNorms          = [];
    
    // extremely small velocities mess up the line intersection math
    this.vx = (Math.abs(this.vx) < FUZZ) ? 0 : this.vx;
    this.vy = (Math.abs(this.vy) < FUZZ) ? 0 : this.vy;
    
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
    
    let g = (this.gravity == undefined) ? gravity : this.gravity;
    let gmag = mag(g.x, g.y);
    
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
        
        if (other.moves) {
          pt.dot = dot(pt.norm.x, pt.norm.y, this.vx - other.vx, this.vy - other.vy);
        } else {
          pt.dot = dot(pt.norm.x, pt.norm.y, this.vx, this.vy);
        }
        
        if (pt.distsq <= minDistsq && pt.dot < 0) {
          minDistsq = pt.distsq;
          minDistPt = pt;
          colliding = true;
        } 
      }
      
      // rather than immediately moving and updating velocity
      // based on the nearest object encountered, in each step we repeatedly check whether
      // movement towards the nearest object actually hits another first, until all objects are exhausted or path is clear.
      // this condition is impossible if the ground is all moving at the same speed, but
      // if the ground objects may move at different speeds, "nearest" is not a consistent
      // metric (sweep velocity is always relative to each object's velocity rather than consistent between all...)
      
      if (minDistPt == undefined) {
        if (!newStep) {
          this.moveby(this.vx, this.vy);
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
          
          let rotContactPt;  
          
          // find the rotational velocity of the colliding object- we find a more distant reference
          // point for the rotational velocity at nearly the same distance if possible- this is
          // because the largest rotational velocity actually affecting the object should be the one considered.
          // this will be useful in cases where a surface of this hitbox is roughly flush with the rotating ground
          // (other set in last iteration, is why it's not defined before here)
          if (other.rotates) {
            let maxCenterDistsq = 0;
            
            for (let pt of lastPts) {
              let ptOther = pt.parent;
      
              if (pt.parent == this) {
                ptOther = pt.generator;
              }
              
              if (ptOther == other && pt.dot < 0 && pt.distsq <= lastDistsq + FUZZIER) {
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
          
          // adjust friction to be lower (higher value) on steeper slopes
          let f = this.frict * other.frict;
          f = (this.slipperyWalls && gmag > 0) ? (1 - (1 - f) * Math.abs(dot(g.x, g.y, lastPt.norm.x, lastPt.norm.y) / gmag)) : f ;
          
          // adjust this hitbox's final velocity based on ground object's + our
          // friction and elasticity- we do this calculation in the ground object's
          // velocity reference frame- based on its linear velocity, rotational velocity at the collision
          // point, and its "moving surface" velocity
          // "final velocity" is specified as opposed to just current "velocity" because
          // friction + elasticity effects are not applied to the velocity we are actually
          // moving by in this motion_sweep call, only the velocity we will end up with at the end
          let [projx, projy] = projnorm(finalVx, finalVy, lastPt.norm.x, lastPt.norm.y);
          finalVx = (finalVx - projx) * f;
          finalVx -= (this.elast + other.elast) * projx / 2;
          finalVy = (finalVy - projy) * f;
          finalVy -= (this.elast + other.elast) * projy / 2;
           
          finalVx += othervx;
          finalVy += othervy;
          
          // determine object we are "standing on" (object we collided with whose surface norm
          // was most directly opposed to gravity), save information about it to, for example,
          // determine movement parameters
          let gravDotNorm = dot(lastPt.norm.x, lastPt.norm.y, g.x, g.y);
          
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
      
      let pushX = minDistPt.norm.x * FUZZ;
      let pushY = minDistPt.norm.y * FUZZ;
      
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
        let opposition = dot(minDistPt.norm.x, minDistPt.norm.y, norm.x, norm.y)
        
        if (opposition < 0 && opposition > -0.99) {
          opposedNorms = true;
          opposedNorm = norm;
          break;
        }
      }
      
      // set the remaining velocity (tangent to the colliding surface) that should be retained for the next step
      // should this colliding object turn out to the nearest in this hitbox's path
      let [projx, projy] = projnorm(other.vx, other.vy, minDistPt.norm.x, minDistPt.norm.y);
      
      stepVx += projx;
      stepVy += projy;
      
      remainderVx = prevVx - stepVx;
      remainderVy = prevVy - stepVy;
      
      stepVx += pushX;
      stepVy += pushY;
      
      this.vx = Math.abs(stepVx) < FUZZIER ? 0 : stepVx;
      this.vy = Math.abs(stepVy) < FUZZIER ? 0 : stepVy;
      
      if (opposedNorms) {
        // if there has been an encountered norm opposed to the colliding surface's norm,
        // physically this hitbox is in a corner and can move no further
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
    
    // move by the final remaining velocity- this must be done because
    // the position update in the loop only occurs when an object has actually been encountered.
    this.moveby(this.vx, this.vy);
    
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
        results.push(...this.get_overlaps(obj, crushLogic));
      } else if (obj instanceof Hitbox) {
        if (this.ignored.includes(obj) || this.encounteredGround.includes(obj)
            || this.encounteredNonsolids.includes(obj)) continue;
        
        let norms;
        
        if (obj.shape instanceof Circle) {
          if (this.shape instanceof Circle) {
            let [tempX, tempY] = normalize_default(this.shape.x - obj.shape.x, this.shape.y - obj.shape.y);
            norms = [{"x": tempX, "y": tempY}];
          } else {
            norms = obj.shape.get_norms(this.shape.get_pts());
            norms.push(...this.shape.get_norms());
          }
        } else {
          norms = obj.shape.get_norms();
          
          if (this.shape instanceof Circle) {
            norms.push(...this.shape.get_norms(obj.shape.get_pts()));
          } else if (!(this.shape instanceof Rect && obj.shape instanceof Rect)) {
            norms.push(...this.shape.get_norms());
          }
        }
        
        let result = {"obj": obj, "crush": true};
        
        let minCompDist = Infinity;
        let minNorm;
        let minOverlap = 0;
        let overlapping = true;
        let savedMymax, savedMymin, savedSign;
                
        for (let norm of norms) {
          let [mymin, mymax, v] = this.get_proj_profile(norm, obj.movedX, obj.movedY);
          let [objmin, objmax] = obj.get_proj_profile(norm);
          
          let overlap = 0;
          let sign = 0;
          
          // crush only if every norm results in crush, of course
          // no overlap if we break
          // go with min overlap otherwise
          // overlap of 0 is no overlap to prevent Problems
          if ((mymax <= objmin) || (mymin >= objmax)) {
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
              
              // velocity biases the determination of which direction
              // this hitbox should be pushed (likely you need to be pushed opposite your velocity
              // because your velocity put you in the situation)
              overlap = crushLogic ? Infinity : ((objmax - mymin + v > mymax - objmin) ? objmin - mymax : objmax - mymin);
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
              
              // see otto for use of v
              overlap = ((objmax - mymin + v > mymax - objmin) ? objmin - mymax : objmax - mymin);
            } else {
              // toto
              
              overlap = objmin - mymax;
            }
          }
          
          // consider the axis with the smallest overlap
          // between this shape and the overlapping shape
          let compDist = Math.abs(overlap);
          
          if (compDist < minCompDist) {
            minCompDist = compDist;
            minNorm = norm;
            minOverlap = overlap;
            savedMymax = mymax;
            savedMymin = mymin;
            savedSign = sign;
          }
          
        }
        
        if (overlapping) {
          result.norm = minNorm;
          result.overlap = minOverlap;
          result.compDist = minCompDist;
          result.width = savedMymax - savedMymin;
          //result.sign = savedSign; // we need to save this instead of sign of overlap in case overlap is 0. sigh.
          
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
        this.moveby(this.vx, this.vy, this.va);
      } else {
        this.moveby(this.vx, this.vy);
      }
    } else if (this.rotates) {
      this.rotate(this.#a + this.va)
    }
    
  }
  
  // second stage of ground collision: if the sweep step hit an inconsistency and did not remove us from all objects
  // or an object rotated into colliding with this hitbox, we must get pushed out of the object
  // uses Separating Axis Theorem to determine translation vectors of overlapping objects- then moves the hitbox,
  // largest overlap vector first.
  // probably should work fine in most cases- in configurations of more than 2 rotating or moving objects
  // it may break down, causing this hitbox to be crushed whe theoretically a resolution might be found.
  motion_correct(objs) {
    let finalVx = this.vx;
    let finalVy = this.vy;
    
    let encounteredSweep = this.encounteredGround;
    this.encounteredGround = [];
    let prevNorms = [];
    
    let overlaps = this.get_overlaps(objs, false);
    let iter = 0;
    
    let g = (this.gravity == undefined) ? gravity : this.gravity;
    let gmag = mag(g.x, g.y);
    
    while (overlaps.length > 0 && iter < 64) {
      let maxCompDist = -Infinity;
      let maxResult = undefined;
      
      for (let result of overlaps) {
        /*
        if (result.crush) {
          this.encounteredGround.push(result.obj);
          continue;
        }
        */
        
        if (result.compDist >= maxCompDist) {
          maxResult = result;
        }
      }
      
      if (maxResult == undefined) break;
      
      this.encounteredGround.push(maxResult.obj);
      
      // object that crushes (fully contains) this hitbox can't push us out, but don't stop here-
      // maybe another object will push us out of this one
      //if (maxResult.crush) continue;
       
      let other = maxResult.obj;
      let norm = maxResult.norm;
      
      let transX = (maxResult.overlap + FUZZ * Math.sign(maxResult.overlap)) * norm.x;
      let transY = (maxResult.overlap + FUZZ * Math.sign(maxResult.overlap)) * norm.y;
      
      norm.x *= Math.sign(maxResult.overlap);
      norm.y *= Math.sign(maxResult.overlap);
      
      // find norm most directly opposed to the translation vector from this intersecting object (if any)
      // unless the norm is very close to being directly opposed
      let opposedNorms = false;
      let opposedNorm;
      
      for (let prevNorm of prevNorms) {
        let theDot = dot(prevNorm.x, prevNorm.y, norm.x, norm.y);
        
        if (theDot < 0 && theDot > -0.99) {
          opposedNorms = true;
          opposedNorm = prevNorm;
          break;
        }
      }
      
      prevNorms.push(norm);
      
      if (opposedNorms) {
        // if there is a norm opposed to this translation vector, adjust our translation vector to
        // be perpendicular to that norm, while still being long enough to remove us from the current
        // object- very directly opposed norms are excluded above because this would create a translation
        // vector of very very great or infinite length
        [transX, transY] = reverse_proj(transX, transY, opposedNorm.y, -opposedNorm.x);
        this.moveby(transX, transY);
      } else {
        this.moveby(transX, transY);
      }
      
      this.movedX += transX;
      this.movedY += transY;
      
      // if we already encountered this ground object in the sweep step, skip over this block-
      // - which adjusts this hitbox's velocity for this collision & does other relevant collision effects -
      // because we already did all that in the sweep step and doing it twice will cause problems of some kind
      if (!encounteredSweep.includes(other)) {
        let othervx = other.vx;
        let othervy = other.vy;
        
        let rotContactPt;
        
        // find the rotational velocity of the intersecting object- in order to do so
        // we must sweep this hitbox by the translation vector we just moved by in order
        // to find the intersection's effective contact point and thus a point to calculate velocity at
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
            if (pt.distsq <= minDistSq + FUZZIER) {
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
        
        // adjust friction to be lower (higher value) on steeper slopes
        let f = this.frict * other.frict;
        f = (this.slipperyWalls && gmag > 0) ? (1 - (1 - f) * Math.abs(dot(g.x, g.y, norm.x, norm.y) / gmag)) : f;
        
        // adjust this hitbox's velocity based on ground object's + our
        // friction and elasticity- we do this calculation in the ground object's
        // velocity reference frame- based on its linear velocity, rotational velocity at the collision
        // point, and its "moving surface" velocity
        this.vx -= othervx;
        this.vy -= othervy;
        
        let [projx, projy] = projnorm(this.vx, this.vy, norm.x, norm.y);
        this.vx = (finalVx - projx) * f;
        this.vx -= (this.elast + other.elast) * projx / 2;
        this.vy = (finalVy - projy) * f;
        this.vy -= (this.elast + other.elast) * projy / 2;
         
        this.vx += othervx;
        this.vy += othervy;
        
        if (other.collideFunc != undefined) {
          other.collideFunc(other, this, norm, this.vx - startVx, this.vy - startVy, rotContactPt);
        }
        
        // determine object we are "standing on" (object we collided with whose surface norm
        // was most directly opposed to gravity), save information about it to, for example,
        // determine movement parameters
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
      
      overlaps = this.get_overlaps(objs, false);
      iter++;
    }
    
    this.encounteredGround = [];
    
    // if this step failed to remove us from all ground, this hitbox is being crushed
    overlaps = this.get_overlaps(objs, false);
    if (overlaps.length > 0) this.events.push("crush");
  }
  
  // note: fluids in the environment are implemented as nonsolids
  nonsolid_collide(nonsolids) {
    this.encounteredNonsolids = [];
    this.ignores              = [];
    this.check_ignores(nonsolids);
    
    let results = this.get_overlaps(nonsolids, false);
    
    for (let result of results) {
      if (result.obj.collideFunc != undefined) {
        result.obj.collideFunc(result.obj, this, result);
      }
    }
    
  }
}

class Camera {
  #posMode;
  #scaleMode;
  #aMode;
  
  #targetX;
  #targetY;
  #targetScale;
  #targetA;
  #posDurTotal;
  #posDurRemaining;
  #scaleDurTotal;
  #scaleDurRemaining;
  #aDurTotal;
  #aDurRemaining;
  
  constructor(x, y, w, h, scale, a) {
    this.x = x;
    this.y = y;
    this.w = w;         // width and height of view
    this.h = h;
    this.scale = scale; // scaling of view units relative to game units
    this.a = a == undefined ? 0 : a // camera's angle is considered ccw (so view angle changes cw)
    
    this.#posMode   = LINEAR;
    this.#scaleMode = LINEAR;
    this.#aMode     = LINEAR;
    
    this.#targetX = x;
    this.#targetY = y;
    this.#targetScale = scale;
    this.#targetA = a;
  
    this.#posDurTotal       = 0;
    this.#posDurRemaining   = 0;
    this.#scaleDurTotal     = 0;
    this.#scaleDurRemaining = 0;
    this.#aDurTotal         = 0;
    this.#aDurRemaining     = 0;
  }
  
  set_pos_target(x, y, dur, mode) {
    this.#targetX = x;
    this.#targetY = y;
    this.#posDurTotal     = dur;
    this.#posDurRemaining = dur;
    this.#posMode = mode;
  }
  
  set_scale_target(scale, dur, mode) {
    this.#targetScale = scale;
    this.#scaleDurTotal     = dur;
    this.#scaleDurRemaining = dur;
    this.#scaleMode = mode;
  }
  
  set_a_target(a, dur, mode) {
    this.#targetA = a;
    this.#aDurTotal     = dur;
    this.#aDurRemaining = dur;
    this.#aMode = mode;
  }
  
  clear_pos_target() {
    this.#targetX = this.x;
    this.#targetY = this.y;
    this.#posDurRemaining = 0;
  }
  
  clear_scale_target() {
    this.#targetScale = this.scale;
    this.#scaleDurRemaining = 0;
  }
  
  clear_a_target() {
    this.#targetA = this.a;
    this.#aDurRemaining = 0;
  }
  
  update() {
    if (this.#posDurRemaining > 1) {
      if (this.#posMode == LINEAR) {
        this.x += (this.#targetX - this.x) / this.#posDurRemaining;
        this.y += (this.#targetY - this.y) / this.#posDurRemaining;
        
      } else if (this.#posMode == SMOOTH) {
        let progress = (this.#posDurTotal - this.#posDurRemaining) / this.#posDurTotal;
        let sin = Math.sin(progress * PI) * PI / this.#posDurTotal;
        let cos = Math.cos(progress * PI);
        this.x += sin * (this.#targetX - this.x) / (1 + cos);
        this.y += sin * (this.#targetY - this.y) / (1 + cos);
      }
      
      this.#posDurRemaining -= 1;
      
    } else if (this.#posDurRemaining == 1) {
      this.x = this.#targetX;
      this.y = this.#targetY;
      this.#posDurRemaining = 0;
    }
    
    if (this.#scaleDurRemaining > 1) {
      if (this.#scaleMode == LINEAR) {
        this.scale += (this.#targetScale - this.scale) / this.#scaleDurRemaining;
      } else if (this.#scaleMode == SMOOTH) {
        let progress = (this.#scaleDurTotal - this.#scaleDurRemaining) / this.#scaleDurTotal;
        let sin = Math.sin(progress * PI) * PI / this.#scaleDurTotal;
        let cos = Math.cos(progress * PI);
        this.scale += sin * (this.#targetScale - this.scale) / (1 + cos);
      }
      
      this.#scaleDurRemaining -= 1;
    
    } else {
      this.scale = this.#targetScale;
      this.#scaleDurRemaining = 0;
    }
    
    if (this.#aDurRemaining > 1) {
      if (this.#aMode == LINEAR) {
        this.a += (this.#targetA - this.a) / this.#aDurRemaining;
      } else if (this.#aMode == SMOOTH) {
        let progress = (this.#aDurTotal - this.#aDurRemaining) / this.#aDurTotal;
        let sin = Math.sin(progress * PI) * PI / this.#aDurTotal;
        let cos = Math.cos(progress * PI);
        this.a += sin * (this.#targetA - this.a) / (1 + cos);
      }
      
      this.#aDurRemaining -= 1;
    
    } else if (this.#aDurRemaining == 1) {
      this.a = this.#targetA;
      this.#aDurRemaining = 0;
    }
  }
}

function debug_draw(shapes, cam, ctx) {
  for (let shape of shapes) {
    if (shape instanceof Array || shape instanceof Set) {
      debug_draw(shape, cam, ctx);
    } else if (shape instanceof Shape) {
      debug_draw_shape(shape, cam, ctx)
    } else if (shape.shape != undefined) {
      debug_draw_shape(shape.shape, cam, ctx);
    } else if (shape.hitbox != undefined && shape.hitbox.shape != undefined) {
      debug_draw_shape(shape.hitbox.shape, cam, ctx);
    }
  }
}

function debug_draw_shape(shape, cam, ctx) {

  function cam_pos(x, y) {
    if (cam.a == 0) {
      return [cam.w / 2 + (cam.scale * (x - cam.x)), cam.h / 2 + (cam.scale * (y - cam.y))];
    } else {
      let cosa = Math.cos(cam.a);
      let sina = Math.sin(cam.a);
      x = (cam.scale * (x - cam.x));
      y = (cam.scale * (y - cam.y));
      return [cam.w / 2 + cosa * x - sina * y, cam.h / 2 + sina * x + cosa * y];
    }
  }
  
  ctx.strokeStyle = (shape.parent && shape.parent.debugDrawColor) ? shape.parent.debugDrawColor : DEFAULT_COLOR;
  ctx.lineWidth   = (shape.parent && shape.parent.debugLineWidth) ? shape.parent.debugLineWidth : DEFAULT_LINE_WIDTH;
  let fill        = (shape.parent && shape.parent.debugDrawFill)  ? shape.parent.debugDrawFill  : DEFAULT_FILL;
  
  
  if (shape instanceof Line) {
    ctx.beginPath();
    ctx.moveTo(...cam_pos(shape.x1, shape.y1));
    ctx.lineTo(...cam_pos(shape.x2, shape.y2));
  } else if (shape instanceof Tri) {
    ctx.beginPath();
    ctx.moveTo(...cam_pos(shape.x1, shape.y1));
    ctx.lineTo(...cam_pos(shape.x2, shape.y2));
    ctx.lineTo(...cam_pos(shape.x3, shape.y3));
    ctx.lineTo(...cam_pos(shape.x1, shape.y1));
  } else if (shape instanceof Rect) {
    ctx.beginPath();
    ctx.moveTo(...cam_pos(shape.x,           shape.y));
    ctx.lineTo(...cam_pos(shape.x + shape.w, shape.y));
    ctx.lineTo(...cam_pos(shape.x + shape.w, shape.y + shape.h));
    ctx.lineTo(...cam_pos(shape.x,           shape.y + shape.h));
    ctx.lineTo(...cam_pos(shape.x,           shape.y));
  } else if (shape instanceof RotRect) {
    ctx.beginPath();
    ctx.moveTo(...cam_pos(shape.x1, shape.y1));
    ctx.lineTo(...cam_pos(shape.x2, shape.y2));
    ctx.lineTo(...cam_pos(shape.x3, shape.y3));
    ctx.lineTo(...cam_pos(shape.x4, shape.y4));
    ctx.lineTo(...cam_pos(shape.x1, shape.y1));
  } else if (shape instanceof Poly) {
    ctx.beginPath();
          
    ctx.moveTo(...cam_pos(shape.ptsX[0], shape.ptsY[0]));
          
    for (let i = 0; i < shape.ptsX.length; i++) {
      ctx.lineTo(...cam_pos(shape.ptsX[i], shape.ptsY[i]));
    }
          
    ctx.lineTo(...cam_pos(shape.ptsX[0], shape.ptsY[0]));
  } else if (shape instanceof Circle) {
    ctx.beginPath();
    ctx.arc(...cam_pos(shape.x, shape.y), shape.r * cam.scale, 0, TAU);
    ctx.stroke();
  }
  
  if (fill != undefined) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  
  ctx.stroke();
        
  if (shape.parent != undefined && shape.parent.rotates) {
    ctx.beginPath();
    ctx.arc(...cam_pos(shape.parent.xc + shape.parent.x, shape.parent.yc + shape.parent.y), 2, 0, TAU);
    ctx.stroke();
  }
}
