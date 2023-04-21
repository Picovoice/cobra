/*
    Copyright 2021-2023 Picovoice Inc.

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
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.util.AttributeSet;
import android.view.View;

public class Gauge extends View {
    private static final int TEXT_SIZE = 26;

    private final int startAngle;
    private final int sweepAngle;
    private final float threshold;

    private final Paint belowPaint;
    private final RectF below;

    private final Paint abovePaint;
    private final RectF above;

    private final Paint textPaint;

    public Gauge(Context context, AttributeSet attrs) {
        super(context, attrs);
        TypedArray a = context.getTheme().obtainStyledAttributes(
                attrs,
                R.styleable.Gauge,
                0, 0
        );

        try {
            this.startAngle = a.getInt(R.styleable.Gauge_startAngle, 0);
            this.sweepAngle = a.getInt(R.styleable.Gauge_sweepAngle, 0);
            this.threshold = a.getFloat(R.styleable.Gauge_threshold, 0);
        } finally {
            a.recycle();
        }

        below = new RectF();
        belowPaint = new Paint();
        belowPaint.setStyle(Paint.Style.STROKE);
        belowPaint.setStrokeWidth(20);
        belowPaint.setStrokeCap(Paint.Cap.ROUND);
        belowPaint.setColor(getResources().getColor(R.color.colorSecondary));

        above = new RectF();
        abovePaint = new Paint();
        abovePaint.setStyle(Paint.Style.STROKE);
        abovePaint.setStrokeWidth(20);
        abovePaint.setStrokeCap(Paint.Cap.ROUND);
        abovePaint.setColor(getResources().getColor(R.color.colorPrimary));

        textPaint = new Paint();
        textPaint.setColor(Color.BLACK);
        textPaint.setTextSize(TEXT_SIZE);
    }

    @Override
    protected void onDraw(Canvas canvas) {
        int centerX = this.getWidth() / 2;
        int centerY = this.getBottom() - 30;
        int radius = centerX - 10;

        below.set(
                centerX - radius,
                centerY - radius,
                centerX + radius,
                centerY + radius
        );
        canvas.drawArc(below, startAngle, sweepAngle * threshold, false, belowPaint);

        above.set(
                centerX - radius,
                centerY - radius,
                centerX + radius,
                centerY + radius
        );
        canvas.drawArc(above, (startAngle * threshold) + startAngle, sweepAngle * (1 - threshold), false, abovePaint);

        canvas.drawText("0%", this.getLeft(), this.getBottom(), textPaint);
        canvas.drawText("100%", centerX + radius - TEXT_SIZE * 2, this.getBottom(), textPaint);
        canvas.drawText(
                "50%",
                centerX + getX(radius, .5f) - (TEXT_SIZE / 2),
                centerY - getY(radius, .5f) - TEXT_SIZE,
                textPaint);
        canvas.drawText(
                "80%",
                centerX + getX(radius, threshold),
                centerY - getY(radius, threshold) - TEXT_SIZE,
                textPaint);
    }

    private float getX(int radius, float percentage) {
        return (float) (radius * Math.cos(Math.toRadians(sweepAngle * (1 - percentage))));
    }

    private float getY(int radius, float percentage) {
        return (float) (radius * Math.sin(Math.toRadians(sweepAngle * (1 - percentage))));
    }
}
