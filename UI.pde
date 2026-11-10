// Ayudas visuales comunes para intervalos, polígonos y estados.
void dibujarContorno(PVector[] p){beginShape();for(int i=0;i<p.length;i++)vertex(p[i].x,p[i].y);endShape(CLOSE);}
void drawShape(PVector[] p){dibujarContorno(p);}
PVector[] rectVertices(float cx,float cy,float w,float h,float a){PVector[] p=new PVector[4];for(int i=0;i<4;i++){float sx=(i==0||i==3)?-1:1,sy=i<2?-1:1;float x=sx*w/2,y=sy*h/2;p[i]=new PVector(cx+x*cos(a)-y*sin(a),cy+x*sin(a)+y*cos(a));}return p;}
PVector[] poligonoRegular(int lados,float cx,float cy,float r,float a){PVector[] p=new PVector[lados];for(int i=0;i<lados;i++){float t=a+TWO_PI*i/lados;p[i]=new PVector(cx+cos(t)*r,cy+sin(t)*r);}return p;}
float promX(PVector[] p){float s=0;for(int i=0;i<p.length;i++)s+=p[i].x;return s/p.length;}
float promY(PVector[] p){float s=0;for(int i=0;i<p.length;i++)s+=p[i].y;return s/p.length;}

void flecha(float x,float y,float dx,float dy,int c){stroke(c);strokeWeight(2);line(x,y,x-dx*12-dy*5,y-dy*12+dx*5);line(x,y,x-dx*12+dy*5,y-dy*12-dx*5);}
void banner(String s,int c){noStroke();fill(FONDO);rect(286,320,330,54,10);fill(c);textFont(fuenteMono);textSize(18);textAlign(CENTER,CENTER);text(s,451,347);textAlign(LEFT,BASELINE);}
