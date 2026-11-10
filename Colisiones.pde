// Algoritmos puros: devuelven una decisión y no dibujan nada.
class Caja {float x,y,w,h;Caja(float x,float y,float w,float h){this.x=x;this.y=y;this.w=w;this.h=h;}}
class SATResultado {boolean colision;PVector eje;float solape;SATResultado(boolean c,PVector e,float s){colision=c;eje=e;solape=s;}}

// Círculos: compara distancia al cuadrado, así evita la raíz cuadrada.
boolean circleVsCircle(float x1,float y1,float r1,float x2,float y2,float r2){float dx=x2-x1,dy=y2-y1,s=r1+r2;return dx*dx+dy*dy<s*s;}
// AABB: hay choque solo con solape estricto en los dos ejes.
boolean aabbVsAabb(float ax,float ay,float aw,float ah,float bx,float by,float bw,float bh){return ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by;}
// SAT: proyecta vértices en las normales y devuelve el eje de separación o el MTV.
SATResultado satPolygons(PVector[] a,PVector[] b){float mejor=Float.MAX_VALUE;PVector mejorEje=new PVector(1,0);
  for(int grupo=0;grupo<2;grupo++){PVector[] p=grupo==0?a:b;for(int i=0;i<p.length;i++){PVector u=p[i],v=p[(i+1)%p.length];PVector eje=new PVector(-(v.y-u.y),v.x-u.x);if(eje.magSq()<0.000001f)continue;eje.normalize();float amin=Float.MAX_VALUE,amax=-Float.MAX_VALUE,bmin=Float.MAX_VALUE,bmax=-Float.MAX_VALUE;
      for(int k=0;k<a.length;k++){float q=a[k].dot(eje);amin=min(amin,q);amax=max(amax,q);}for(int k=0;k<b.length;k++){float q=b[k].dot(eje);bmin=min(bmin,q);bmax=max(bmax,q);}float sol=min(amax,bmax)-max(amin,bmin);
      if(sol<=0)return new SATResultado(false,eje,0);if(sol<mejor){mejor=sol;mejorEje=eje.copy();}
  }}float ca=0,cb=0;for(int i=0;i<a.length;i++)ca+=a[i].dot(mejorEje)/a.length;for(int i=0;i<b.length;i++)cb+=b[i].dot(mejorEje)/b.length;if((ca-cb)<0)mejorEje.mult(-1);return new SATResultado(true,mejorEje,mejor);}
// Barrido de un punto: devuelve t de primer impacto en [0,1], o -1.
float segmentVsAabb(float x0,float y0,float x1,float y1,Caja c){float dx=x1-x0,dy=y1-y0,t0=0,t1=1;
  if(abs(dx)<0.00001f){if(x0<=c.x||x0>=c.x+c.w)return -1;}else{float a=(c.x-x0)/dx,b=(c.x+c.w-x0)/dx;t0=max(t0,min(a,b));t1=min(t1,max(a,b));}
  if(abs(dy)<0.00001f){if(y0<=c.y||y0>=c.y+c.h)return -1;}else{float a=(c.y-y0)/dy,b=(c.y+c.h-y0)/dy;t0=max(t0,min(a,b));t1=min(t1,max(a,b));}
  return t1>t0&&t0>=0&&t0<=1?t0:-1;}
