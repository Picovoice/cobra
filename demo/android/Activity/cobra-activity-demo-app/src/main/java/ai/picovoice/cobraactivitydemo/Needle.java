/*
    Copyright 2021 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/


package ai.picovoice.cobraactivitydemo;

import android.content.Context;
import android.content.res.TypedArray;
import android.graphics.Canvas;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Path;
import android.util.AttributeSet;
import android.view.View;

public class Needle extends View {
    private static final float ALPHA = 0.5f;
    private final float threshold;
    private float value = 0;
    private boolean isDetected = false;

    private final Matrix matrix;
    private final Path needle;
    private final Paint needlePaint;

    public Needle(Context context, AttributeSet attrs) {
        super(context, attrs);

        TypedArray a = context.getTheme().obtainStyledAttributes(
                attrs,
                R.styleable.Needle,
                0, 0
        );

        try {
            this.threshold = a.getFloat(R.styleable.Needle_threshold, 0);
        } finally {
            a.recycle();
        }

        matrix = new Matrix();
        needle = new Path();
        needlePaint = new Paint();
        needlePaint.setColor(getResources().getColor(R.color.colorSecondary));
        needlePaint.setStyle(Paint.Style.FILL);
    }

    public void setValue(float value) {
        this.value = (ALPHA * value) + ((1 - ALPHA) * this.value);
        this.isDetected = this.value >= this.threshold;
        this.invalidate();
    }

    public boolean isDetected() {
        return isDetected;
    }

    public void reset() {
        while (this.value > 0.001) {
            setValue(0);
        }
    }

    @Override
    protected void onDraw(Canvas canvas) {
        int centerX = this.getWidth() / 2;
        int centerY = this.getBottom() - 30;
        int radius = centerX - 10;

        needle.reset();
        needle.moveTo(radius - 10, 0);
        needle.lineTo(0, -10);
        needle.lineTo(-10, 0);
        needle.lineTo(0, 10);
        needle.lineTo(radius - 10, 0);

        if (this.value >= this.threshold) {
            needlePaint.setColor(getResources().getColor(R.color.colorPrimary));
        } else {
            needlePaint.setColor(getResources().getColor(R.color.colorSecondary));
        }

        matrix.setTranslate(centerX, centerY);
        matrix.preRotate(-180 + (180 * this.value));
        needle.transform(matrix);
        canvas.drawPath(needle, needlePaint);
    }
}
