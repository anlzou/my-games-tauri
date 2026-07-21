import {
	BufferGeometry,
	Float32BufferAttribute,
	Vector3
} from 'three';

/**
 * ConvexGeometry - Compute the convex hull of a set of points.
 * Uses the Quickhull algorithm.
 */

// Ported from three.js examples (ConvexGeometry / ConvexHull)

const _v1 = new Vector3();
const _v2 = new Vector3();

function isNotFromEdge( face, vertex ) {

	for ( let i = 0; i < face.edges.length; i ++ ) {

		const edge = face.edges[ i ];
		if ( edge.headA === vertex || edge.headB === vertex ) return false;

	}

	return true;

}

class Face {

	constructor() {

		this.normal = new Vector3();
		this.midpoint = new Vector3();
		this.area = 0;
		this.constant = 0;
		this.outside = null;
		this.mark = 0;
		this.edge = null;
		this.edges = [];

	}

	static create( a, b, c ) {

		const face = new Face();
		const e0 = new HalfEdge( a, face );
		const e1 = new HalfEdge( b, face );
		const e2 = new HalfEdge( c, face );

		// join edges
		e0.next = e1;
		e1.next = e2;
		e2.next = e0;

		e0.prev = e2;
		e1.prev = e0;
		e2.prev = e1;

		// main half edge
		face.edge = e0;

		face.compute();

		return face;

	}

	getEdge( i ) {

		let edge = this.edge;
		while ( i > 0 ) {

			edge = edge.next;
			i --;

		}

		while ( i < 0 ) {

			edge = edge.prev;
			i ++;

		}

		return edge;

	}

	compute() {

		const a = this.edge.head();
		const b = this.edge.next.head();
		const c = this.edge.next.next.head();

		_v1.subVectors( b, a );
		_v2.subVectors( c, a );
		this.normal.crossVectors( _v1, _v2 ).normalize();

		this.midpoint.addVectors( a, b ).add( c ).divideScalar( 3 );
		this.area = _v1.cross( _v2 ).length() / 2;

		// Compute constant for plane equation
		this.constant = - this.normal.dot( a );

	}

	distanceToPoint( point ) {

		return this.normal.dot( point ) + this.constant;

	}

}

class HalfEdge {

	constructor( vertex, face ) {

		this.vertex = vertex;
		this.face = face;
		this.next = null;
		this.prev = null;
		this.twin = null;

	}

	head() {

		return this.vertex;

	}

	tail() {

		return this.prev ? this.prev.vertex : null;

	}

	length() {

		const head = this.head();
		const tail = this.tail();
		if ( tail !== null ) {

			return tail.distanceTo( head );

		}

		return - 1;

	}

	lengthSquared() {

		const head = this.head();
		const tail = this.tail();
		if ( tail !== null ) {

			return tail.distanceToSquared( head );

		}

		return - 1;

	}

	setTwin( edge ) {

		this.twin = edge;
		edge.twin = this;

	}

}

class ConvexHull {

	constructor() {

		this.tolerance = - 1;
		this.faces = [];
		this.newFaces = [];
		this.assigned = new VertexList();
		this.unassigned = new VertexList();
		this.vertices = [];

	}

	setFromPoints( points ) {

		// Clone points into vertices
		const vertices = [];
		for ( let i = 0; i < points.length; i ++ ) {

			const point = points[ i ];
			const vertex = new VertexNode( point );
			vertices.push( vertex );
			this.vertices.push( vertex );

		}

		if ( vertices.length < 4 ) {

			console.error( 'ConvexGeometry: need at least 4 points' );
			return this;

		}

		// Compute initial simplex
		this.computeInitialHull( vertices );

		// Add points to hull
		this.addPointsToHull();

		// Export faces as triangles
		return this;

	}

	computeInitialHull( vertices ) {

		let v0, v1, v2, v3;

		// Find 3 non-collinear points
		v0 = vertices[ 0 ];

		for ( let i = 1; i < vertices.length; i ++ ) {

			v1 = vertices[ i ];
			if ( v0.position.distanceToSquared( v1.position ) > 0 ) break;

		}

		for ( let i = 2; i < vertices.length; i ++ ) {

			v2 = vertices[ i ];
			_v1.subVectors( v1.position, v0.position );
			_v2.subVectors( v2.position, v0.position );
			if ( _v1.cross( _v2 ).length() > 1e-6 ) break;

		}

		for ( let i = 3; i < vertices.length; i ++ ) {

			v3 = vertices[ i ];
			_v1.subVectors( v1.position, v0.position );
			_v2.subVectors( v2.position, v0.position );
			const _v3 = new Vector3().subVectors( v3.position, v0.position );
			if ( Math.abs( _v1.dot( _v2.cross( _v3 ) ) ) > 1e-6 ) break;

		}

		// Build initial faces
		const faces = [
			Face.create( v0, v1, v2 ),
			Face.create( v0, v2, v1 ),
			Face.create( v0, v3, v1 ),
			Face.create( v0, v2, v3 ),
			Face.create( v0, v1, v3 ),
			Face.create( v1, v2, v3 )
		];

		// Compute tolerance
		let maxDist = 0;
		for ( let i = 0; i < 6; i ++ ) {

			const face = faces[ i ];
			for ( let j = i + 1; j < 6; j ++ ) {

				const other = faces[ j ];
				const dist = Math.abs( face.distanceToPoint( other.midpoint ) );
				if ( dist > maxDist ) maxDist = dist;

			}

		}

		this.tolerance = maxDist * 0.001;

		// Set face adjacency
		for ( let i = 0; i < 6; i ++ ) {

			const face = faces[ i ];
			const edge = face.edge;
			const other = faces[ ( i % 2 === 0 ) ? i + 1 : i - 1 ];

			edge.twin = other.edge;
			other.edge.twin = edge;

		}

		// Add faces
		for ( let i = 0; i < 6; i ++ ) {

			this.faces.push( faces[ i ] );

		}

		// Mark visible faces and compute horizon
		// For initial hull, all faces are visible from v3 (if we use all 4 points)
		// We need to handle the initial tetrahedron properly

		// Find the point furthest from one face and use it as the 4th point
		// Already using v0,v1,v2,v3

		// Reorient faces so they point outward
		const center = new Vector3();
		for ( let i = 0; i < 4; i ++ ) {

			center.add( vertices[ i ].position );

		}
		center.divideScalar( 4 );

		for ( let i = 0; i < this.faces.length; i ++ ) {

			const face = this.faces[ i ];
			if ( face.distanceToPoint( center ) > 0 ) {

				face.normal.negate();
				face.constant = - face.constant;

				// Swap edge order
				const temp = face.edge.next;
				face.edge.next = face.edge.prev;
				face.edge.prev = temp;

			}

		}

	}

	addPointsToHull() {

		// Assign vertices to faces
		for ( let i = 0; i < this.vertices.length; i ++ ) {

			const vertex = this.vertices[ i ];
			let maxDist = this.tolerance;
			let maxFace = null;

			for ( let j = 0; j < this.faces.length; j ++ ) {

				const face = this.faces[ j ];
				const dist = face.distanceToPoint( vertex.position );
				if ( dist > maxDist ) {

					maxDist = dist;
					maxFace = face;

				}

			}

			if ( maxFace !== null ) {

				this.addVertexToFace( vertex, maxFace );

			}

		}

	}

	addVertexToFace( vertex, face ) {

		vertex.face = face;

		if ( face.outside === null ) {

			this.assigned.append( vertex );

		} else {

			this.assigned.insertBefore( face.outside, vertex );

		}

		face.outside = vertex;

	}

	removeVertexFromFace( vertex, face ) {

		if ( vertex === face.outside ) {

			if ( vertex.next !== null && vertex.next.face === face ) {

				face.outside = vertex.next;

			} else {

				face.outside = null;

			}

		}

		this.assigned.remove( vertex );

	}

	addPointToHull( eyeVertex ) {

		// Find faces visible from eyeVertex
		const visibleFaces = this.computeHorizon( eyeVertex );

		if ( visibleFaces.length === 0 ) return;

		// Create new faces from horizon edges
		const newFaces = [];

		for ( let i = 0; i < visibleFaces.length; i ++ ) {

			const face = visibleFaces[ i ];
			const edge = face.edge;

			// For each edge on the horizon, create a new face
			let horizonEdge = edge;
			do {

				if ( horizonEdge.twin !== null && ! visibleFaces.includes( horizonEdge.twin.face ) ) {

					// This is a horizon edge
					const newFace = Face.create( horizonEdge.tail(), horizonEdge.head(), eyeVertex );
					newFaces.push( newFace );
					horizonEdge.twin.setTwin( newFace.edge );

				}

				horizonEdge = horizonEdge.next;

			} while ( horizonEdge !== edge );

		}

		// Remove visible faces
		for ( let i = 0; i < visibleFaces.length; i ++ ) {

			const face = visibleFaces[ i ];
			const idx = this.faces.indexOf( face );
			if ( idx >= 0 ) this.faces.splice( idx, 1 );

			// Remove vertex assignments
			let vertex = face.outside;
			while ( vertex !== null && vertex.face === face ) {

				const next = vertex.next;
				this.removeVertexFromFace( vertex, face );
				vertex = next;

			}

		}

		// Add new faces
		for ( let i = 0; i < newFaces.length; i ++ ) {

			this.faces.push( newFaces[ i ] );

		}

		// Reassign previously assigned vertices to new faces
		const unassigned = this.assigned;
		this.assigned = new VertexList();

		let vertex = unassigned.first;
		while ( vertex !== null ) {

			const next = vertex.next;
			this.addVertexToFace( vertex, this.findClosestFace( vertex ) );
			vertex = next;

		}

	}

	computeHorizon( eyeVertex ) {

		const visibleFaces = [];
		const horizonEdges = [];

		// Start from the face containing eyeVertex
		let startFace = null;
		for ( let i = 0; i < this.faces.length; i ++ ) {

			const face = this.faces[ i ];
			if ( face.distanceToPoint( eyeVertex.position ) > this.tolerance ) {

				visibleFaces.push( face );
				startFace = face;
				break;

			}

		}

		if ( startFace === null ) return visibleFaces;

		// Traverse to find all visible faces and horizon
		const stack = [ startFace ];
		while ( stack.length > 0 ) {

			const face = stack.pop();
			let edge = face.edge;

			do {

				const twin = edge.twin;
				if ( twin !== null ) {

					const twinFace = twin.face;
					if ( ! visibleFaces.includes( twinFace ) ) {

						if ( twinFace.distanceToPoint( eyeVertex.position ) > this.tolerance ) {

							visibleFaces.push( twinFace );
							stack.push( twinFace );

						} else {

							horizonEdges.push( edge );

						}

					}

				}

				edge = edge.next;

			} while ( edge !== face.edge );

		}

		return visibleFaces;

	}

	findClosestFace( vertex ) {

		let minDist = Infinity;
		let minFace = null;

		for ( let i = 0; i < this.faces.length; i ++ ) {

			const face = this.faces[ i ];
			const dist = face.distanceToPoint( vertex.position );
			if ( dist < minDist ) {

				minDist = dist;
				minFace = face;

			}

		}

		return minFace;

	}

}

class VertexNode {

	constructor( point ) {

		this.position = point;
		this.prev = null;
		this.next = null;
		this.face = null;

	}

}

class VertexList {

	constructor() {

		this.head = null;
		this.tail = null;

	}

	get first() {

		return this.head;

	}

	get last() {

		return this.tail;

	}

	append( vertex ) {

		if ( this.head === null ) {

			this.head = vertex;
			this.tail = vertex;
			vertex.prev = null;
			vertex.next = null;

		} else {

			this.tail.next = vertex;
			vertex.prev = this.tail;
			vertex.next = null;
			this.tail = vertex;

		}

	}

	appendChain( vertex ) {

		if ( this.head === null ) {

			this.head = vertex;
			this.tail = vertex;

		} else {

			this.tail.next = vertex;
			vertex.prev = this.tail;
			this.tail = vertex;

		}

	}

	remove( vertex ) {

		if ( vertex.prev !== null ) {

			vertex.prev.next = vertex.next;

		} else {

			this.head = vertex.next;

		}

		if ( vertex.next !== null ) {

			vertex.next.prev = vertex.prev;

		} else {

			this.tail = vertex.prev;

		}

		vertex.prev = null;
		vertex.next = null;

	}

	insertBefore( reference, vertex ) {

		vertex.prev = reference.prev;
		vertex.next = reference;

		if ( reference.prev === null ) {

			this.head = vertex;

		} else {

			reference.prev.next = vertex;

		}

		reference.prev = vertex;

	}

	isEmpty() {

		return this.head === null;

	}

}

class ConvexGeometry extends BufferGeometry {

	constructor( points = [] ) {

		super();

		// filters
		const filteredPoints = [];

		// Remove duplicate points
		const seen = new Set();
		for ( let i = 0; i < points.length; i ++ ) {

			const p = points[ i ];
			const key = `${p.x},${p.y},${p.z}`;
			if ( ! seen.has( key ) ) {

				seen.add( key );
				filteredPoints.push( p );

			}

		}

		if ( filteredPoints.length < 4 ) {

			console.error( 'ConvexGeometry: need at least 4 non-coplanar points' );
			return;

		}

		// Compute convex hull
		const hull = new ConvexHull();
		hull.setFromPoints( filteredPoints );

		// Extract triangle vertices from hull faces
		const vertices = [];
		for ( let i = 0; i < hull.faces.length; i ++ ) {

			const face = hull.faces[ i ];
			let edge = face.edge;
			const verts = [];

			do {

				verts.push( edge.head().position.clone() );
				edge = edge.next;

			} while ( edge !== face.edge );

			// Triangulate face (polygon with n>3 edges)
			// Simple fan triangulation from vertex 0
			// Skip degenerate faces
			if ( verts.length < 3 ) continue;

			// Check if face is already a triangle
			if ( verts.length === 3 ) {

				vertices.push( verts[ 0 ], verts[ 1 ], verts[ 2 ] );

			} else {

				// Fan triangulation
				for ( let j = 1; j < verts.length - 1; j ++ ) {

					vertices.push( verts[ 0 ], verts[ j ], verts[ j + 1 ] );

				}

			}

		}

		// Build geometry
		const positionAttribute = new Float32BufferAttribute( vertices.length * 3, 3 );

		for ( let i = 0; i < vertices.length; i ++ ) {

			const v = vertices[ i ];
			positionAttribute.setXYZ( i, v.x, v.y, v.z );

		}

		this.setAttribute( 'position', positionAttribute );

	}

}

export { ConvexGeometry };
